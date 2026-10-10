"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole, ForbiddenError } from "@/lib/guard";
import { normalizeFacebookUrl, normalizeMeetingUrl, todayISO, formatVND } from "@/lib/format";
import {
  notifyUser,
  getClass,
  getPackageProgressBatch,
  isTeacherAvailable,
  listSiblingClasses,
} from "@/lib/queries";
import { classStage, formatClassSchedule, type ClassRow, MANAGE_ROLES, canonicalSubject, ADMIN_AREA_ROLES } from "@/lib/types";
import { logAudit } from "@/lib/audit";
import { contactEmailOf, meetingLinkMail, queueMail } from "@/lib/mail";
import {
  awardConversionForClass,
  awardMissingForCustomer,
  CONVERTED_STAGES,
  customerClassIds,
  transferClassBonuses,
} from "@/lib/bonus";
import type { FormState } from "./teachers";

function notifyTeacherOfAssignment(params: {
  teacherId: number;
  classId: number;
  studentName: string;
  subject: string;
  /** One formatted schedule string per weekly slot, so a 2-3 buổi/tuần class lists all of them. */
  schedules: string[];
}) {
  // Marks that this class's next recorded attendance should auto-count as
  // the trial session — only reached via the center-assigns-a-teacher flow,
  // never a teacher's own self-add, so backfilled old classes never get
  // flagged as trials.
  // Lớp trung tâm vừa giao thì buổi đầu là buổi học thử, nên trạng thái nghiệp
  // vụ cũng bắt đầu ở "Học thử" — trừ khi giáo vụ đã đặt trạng thái khác.
  db.prepare(
    "UPDATE classes SET trial_pending = 1, stage = CASE WHEN stage = 'studying' THEN 'trial' ELSE stage END WHERE id = ?"
  ).run(params.classId);
  const scheduleNote =
    params.schedules.length > 1 ? params.schedules.join(", ") : params.schedules[0];
  notifyUser(
    params.teacherId,
    `Bạn được giao lớp mới: ${params.studentName} (${params.subject}, ${scheduleNote}). ` +
      `Lưu ý: buổi đầu tiên tính là buổi học thử (50.000đ/tiết).`,
    params.classId
  );
}

/** Có phải nhân sự quản lý đang hoạt động không — người duy nhất được nhận thưởng. */
function isActiveStaff(userId: number): boolean {
  return !!db
    .prepare("SELECT 1 FROM users WHERE id = ? AND role IN ('admin','manager','coordinator') AND active = 1")
    .get(userId);
}

export async function createClassAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  // Nhân viên đặt hẹn được tạo lớp (trang /admin/tao-lop) nhưng không sửa,
  // xoá hay xem danh sách lớp — mọi hành động khác trên lớp vẫn là của Quản lý.
  const session = await assertRole([...ADMIN_AREA_ROLES, "teacher"]);

  const studentName = String(formData.get("student_name") || "").trim();
  const studentPhone = String(formData.get("student_phone") || "").trim();
  const guardianName = String(formData.get("guardian_name") || "").trim();
  const facebookUrl = normalizeFacebookUrl(String(formData.get("facebook_url") || ""));
  const level = String(formData.get("level") || "").trim();
  const subject = canonicalSubject(String(formData.get("subject") || "")) || "Guitar";
  const language = String(formData.get("language") || "vi") === "en" ? "en" : "vi";
  const scheduleType = String(formData.get("schedule_type") || "fixed") === "flexible" ? "flexible" : "fixed";
  const notes = String(formData.get("notes") || "").trim();
  const packageRaw = String(formData.get("package_total_sessions") || "");
  const packageTotalSessions = packageRaw ? Number(packageRaw) : null;

  // A student studying 2-3 buổi/tuần is entered as multiple weekly slots
  // in one submission — each becomes its own `classes` row (one per
  // day/time), all sharing a single package pool. The form repeats
  // slot_day/slot_time/slot_duration inputs, one triplet per slot, in
  // document order, which FormData.getAll preserves.
  const slots =
    scheduleType === "flexible"
      ? [{ dayOfWeek: -1, startTime: "", durationMinutes: 60 }]
      : formData
          .getAll("slot_day")
          .map((day, i) => ({
            dayOfWeek: Number(day),
            startTime: String(formData.getAll("slot_time")[i] || ""),
            durationMinutes: Number(formData.getAll("slot_duration")[i] || 60) || 60,
          }))
          .filter((s) => !Number.isNaN(s.dayOfWeek) && s.startTime);

  // Teachers can only ever create a class for themselves — the client
  // never even shows them a teacher picker, but derive it from the
  // session rather than trusting the form either way. Only a teacher's
  // own form exposes "nguồn lớp" (center-assigned vs. self-found); an
  // admin/coordinator entering a class is always the center's own record.
  let teacherId: number | null;
  let source: "center" | "self" = "center";
  if (session.role === "teacher") {
    teacherId = session.userId;
    source = String(formData.get("source") || "center") === "self" ? "self" : "center";
  } else {
    const teacherIdRaw = String(formData.get("teacher_id") || "");
    teacherId = teacherIdRaw ? Number(teacherIdRaw) : null;
  }

  if (!studentName || slots.length === 0) {
    return { error: "Vui lòng nhập đầy đủ thông tin lớp học" };
  }

  let packageId: number | null = null;
  if (packageTotalSessions) {
    const info = db
      .prepare("INSERT INTO packages (total_sessions, started_at) VALUES (?, ?)")
      .run(packageTotalSessions, todayISO());
    packageId = Number(info.lastInsertRowid);
  }

  // Giáo vụ phụ trách: ai tạo lớp thì mặc định người đó, admin chọn lại được.
  // Đây là gốc để tính thưởng nên phải có từ lúc tạo lớp, không để điền sau.
  // Người nhận thưởng của khách này.
  //  • Nhân viên đặt hẹn tạo lớp: luôn là chính họ, không tin ô trong form.
  //  • Quản lý / chủ trung tâm: lấy theo ô "Người đặt hẹn"; để trống là chưa
  //    chọn ai (trang Thưởng sẽ nhắc gán). Form nào không có ô đó thì giữ cách
  //    cũ — người tạo là người phụ trách.
  let coordinatorId: number | null;
  if (session.role === "coordinator") {
    coordinatorId = session.userId;
  } else if (formData.has("coordinator_id")) {
    const picked = Number(formData.get("coordinator_id") || 0);
    coordinatorId = picked > 0 && isActiveStaff(picked) ? picked : null;
  } else {
    coordinatorId = session.role === "admin" || session.role === "manager" ? session.userId : null;
  }

  const insert = db.prepare(
    `INSERT INTO classes (student_name, student_phone, guardian_name, facebook_url, level, subject, language, source, package_id, schedule_type, day_of_week, start_time, duration_minutes, teacher_id, notes, coordinator_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
  );
  let firstClassId: number | null = null;
  for (const slot of slots) {
    const info = insert.run(
      studentName,
      studentPhone || null,
      guardianName || null,
      facebookUrl,
      level || null,
      subject,
      language,
      source,
      packageId,
      scheduleType,
      slot.dayOfWeek,
      slot.startTime,
      slot.durationMinutes,
      teacherId,
      notes || null,
      coordinatorId
    );
    firstClassId ??= Number(info.lastInsertRowid);
  }

  if (teacherId && session.role !== "teacher" && firstClassId) {
    notifyTeacherOfAssignment({
      teacherId,
      classId: firstClassId,
      studentName,
      subject,
      schedules: slots.map((slot) =>
        formatClassSchedule({
          schedule_type: scheduleType,
          day_of_week: slot.dayOfWeek,
          start_time: slot.startTime,
          duration_minutes: slot.durationMinutes,
        })
      ),
    });
  }

  // Lớp tạo từ một đăng ký học thử thì đánh dấu luôn đăng ký đó là đã xếp
  // lớp — giáo vụ khỏi phải nhớ quay lại đổi trạng thái, và danh sách chờ
  // không còn tên người đã vào học.
  // Chỉ giáo vụ/quản trị mới được đụng vào danh sách đăng ký học thử — giáo
  // viên tự thêm lớp của mình thì không có việc gì ở đó.
  const trialRequestId = Number(formData.get("trial_request_id") || 0);
  if (trialRequestId && session.role !== "teacher") {
    db.prepare("UPDATE trial_requests SET status = 'done' WHERE id = ?").run(trialRequestId);
    revalidatePath("/admin/trial-requests");
  }

  revalidatePath("/admin/classes");
  revalidatePath("/admin/assign");
  revalidatePath("/admin/tao-lop");
  revalidatePath("/teacher/schedule");
  revalidatePath("/teacher");
  return { success: true };
}

/**
 * Thêm một buổi/tuần nữa cho lớp đang có (học viên học 2-3 buổi/tuần).
 *
 * Mỗi buổi trong tuần vẫn là một dòng `classes` riêng dùng chung `package_id`
 * — đúng mô hình lúc tạo lớp — nên tiến độ gói, học phí và điểm danh gộp
 * chung mà không cần bảng nào khác. Buổi mới chép toàn bộ thông tin học viên
 * và giáo viên từ buổi gốc, chỉ khác ngày/giờ.
 */
export async function addWeeklySlotAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole([...MANAGE_ROLES, "teacher"]);

  const classId = Number(formData.get("class_id"));
  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = String(formData.get("start_time") || "").trim();
  const durationMinutes = Number(formData.get("duration_minutes") || 60) || 60;

  if (!classId || Number.isNaN(dayOfWeek) || !startTime) {
    return { error: "Vui lòng chọn ngày và giờ học" };
  }

  const cls = db.prepare("SELECT * FROM classes WHERE id = ?").get(classId) as ClassRow | undefined;
  if (!cls) return { error: "Không tìm thấy lớp học" };
  if (session.role === "teacher" && cls.teacher_id !== session.userId) {
    return { error: "Bạn không phụ trách lớp này" };
  }
  if (cls.schedule_type !== "fixed") {
    return { error: "Lớp lịch linh động hẹn từng buổi, không có lịch cố định để thêm" };
  }

  const siblings = db
    .prepare(
      "SELECT day_of_week, start_time FROM classes WHERE id = ? OR (package_id IS NOT NULL AND package_id = ?)"
    )
    .all(classId, cls.package_id) as { day_of_week: number; start_time: string }[];
  if (siblings.some((s) => s.day_of_week === dayOfWeek && s.start_time === startTime)) {
    return { error: "Buổi này đã có trong lịch của lớp" };
  }
  if (cls.teacher_id && !isTeacherAvailable(cls.teacher_id, dayOfWeek, startTime, durationMinutes)) {
    return { error: "Giáo viên đã bận vào giờ này" };
  }

  // Buổi thêm sau không phải buổi học thử của lớp, nên trial_pending để 0.
  db.prepare(
    `INSERT INTO classes (student_name, student_phone, guardian_name, facebook_url, student_user_id, level, subject, language, source, package_id, schedule_type, day_of_week, start_time, duration_minutes, teacher_id, notes, status, stage, paused_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fixed', ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    cls.student_name,
    cls.student_phone,
    cls.guardian_name,
    cls.facebook_url,
    cls.student_user_id,
    cls.level,
    cls.subject,
    cls.language,
    cls.source,
    cls.package_id,
    dayOfWeek,
    startTime,
    durationMinutes,
    cls.teacher_id,
    cls.notes,
    cls.status,
    cls.stage,
    cls.paused_until
  );

  revalidateClassViews(classId);
  return { success: true };
}

/** Bỏ một buổi/tuần khỏi lớp. Buổi đã có điểm danh thì giữ lại để không mất lịch sử. */
export async function removeWeeklySlotAction(slotClassId: number) {
  const session = await assertRole([...MANAGE_ROLES, "teacher"]);
  const cls = db.prepare("SELECT * FROM classes WHERE id = ?").get(slotClassId) as
    | ClassRow
    | undefined;
  if (!cls) throw new ForbiddenError("Không tìm thấy buổi học này");
  if (session.role === "teacher" && cls.teacher_id !== session.userId) {
    throw new ForbiddenError();
  }

  const attended = db
    .prepare("SELECT COUNT(*) as c FROM attendance WHERE class_id = ?")
    .get(slotClassId) as { c: number };
  if (attended.c > 0) {
    throw new ForbiddenError(
      `Buổi này đã có ${attended.c} lần điểm danh. Xoá là mất lịch sử dạy và tiền công đã chấm — bấm "Ngừng buổi này" để bỏ khỏi lịch tuần mà vẫn giữ sổ sách.`
    );
  }

  db.prepare("DELETE FROM classes WHERE id = ?").run(slotClassId);
  logAudit(
    session,
    "lop_hoc",
    `Xoá buổi ${formatClassSchedule(cls)} của ${cls.student_name} (chưa từng điểm danh)`
  );
  revalidateClassViews(slotClassId);
}

/**
 * Ngừng (hoặc cho học lại) một buổi trong tuần.
 *
 * Học viên bỏ buổi thứ Tư nhưng vẫn học các buổi khác: xoá dòng đó là mất
 * lịch sử điểm danh và tiền công của những buổi Tư đã dạy. Thay vào đó đánh
 * dấu ngừng — buổi biến khỏi lịch tuần và không ai điểm danh nữa, còn sổ sách
 * cũ nguyên vẹn.
 */
export async function endWeeklySlotAction(slotClassId: number, ended: boolean) {
  const session = await assertRole([...MANAGE_ROLES, "teacher"]);
  const cls = db.prepare("SELECT * FROM classes WHERE id = ?").get(slotClassId) as
    | ClassRow
    | undefined;
  if (!cls) throw new ForbiddenError("Không tìm thấy buổi học này");
  if (session.role === "teacher" && cls.teacher_id !== session.userId) {
    throw new ForbiddenError();
  }

  const info = classStage(ended ? "not_studying" : "studying");
  db.prepare("UPDATE classes SET stage = ?, status = ?, paused_until = NULL WHERE id = ?").run(
    info.value,
    info.status,
    slotClassId
  );
  logAudit(
    session,
    "lop_hoc",
    `${ended ? "Ngừng" : "Mở lại"} buổi ${formatClassSchedule(cls)} của ${cls.student_name}`
  );
  revalidateClassViews(slotClassId);
}

/** Đổi ngày/giờ của một buổi trong tuần, giữ nguyên lịch sử của buổi đó. */
export async function moveWeeklySlotAction(
  slotClassId: number,
  dayOfWeek: number,
  startTime: string,
  durationMinutes: number
) {
  const session = await assertRole([...MANAGE_ROLES, "teacher"]);
  const cls = db.prepare("SELECT * FROM classes WHERE id = ?").get(slotClassId) as
    | ClassRow
    | undefined;
  if (!cls) throw new ForbiddenError("Không tìm thấy buổi học này");
  if (session.role === "teacher" && cls.teacher_id !== session.userId) {
    throw new ForbiddenError();
  }
  if (Number.isNaN(dayOfWeek) || !startTime) {
    throw new ForbiddenError("Chọn ngày và giờ học mới");
  }

  db.prepare(
    `UPDATE classes SET schedule_type = 'fixed', day_of_week = ?, start_time = ?, duration_minutes = ?
     WHERE id = ?`
  ).run(dayOfWeek, startTime, durationMinutes || cls.duration_minutes, slotClassId);
  revalidateClassViews(slotClassId);
}

/** Mọi trang đổi theo khi lịch tuần của một lớp thay đổi. */
function revalidateClassViews(classId: number) {
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin/assign");
  revalidatePath("/teacher");
  revalidatePath("/teacher/schedule");
  revalidatePath("/student");
}

export async function updateClassAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole([...MANAGE_ROLES, "teacher"]);

  const id = Number(formData.get("id"));
  const studentName = String(formData.get("student_name") || "").trim();
  const studentPhone = String(formData.get("student_phone") || "").trim();
  const guardianName = String(formData.get("guardian_name") || "").trim();
  const facebookUrl = normalizeFacebookUrl(String(formData.get("facebook_url") || ""));
  const level = String(formData.get("level") || "").trim();
  const subject = canonicalSubject(String(formData.get("subject") || "")) || "Guitar";
  const language = String(formData.get("language") || "vi") === "en" ? "en" : "vi";
  const scheduleType = String(formData.get("schedule_type") || "fixed") === "flexible" ? "flexible" : "fixed";
  const dayOfWeek = scheduleType === "flexible" ? -1 : Number(formData.get("day_of_week"));
  const startTime = scheduleType === "flexible" ? "" : String(formData.get("start_time") || "");
  const durationMinutes = Number(formData.get("duration_minutes") || 60);
  const notes = String(formData.get("notes") || "").trim();
  const meetingUrl = normalizeMeetingUrl(String(formData.get("meeting_url") || ""));

  if (!id || !studentName || (scheduleType === "fixed" && (Number.isNaN(dayOfWeek) || !startTime))) {
    return { error: "Vui lòng nhập đầy đủ thông tin lớp học" };
  }

  if (meetingUrl && /meet\.google\.com\/new\/?$/i.test(meetingUrl)) {
    return {
      error:
        "Đây là link TẠO phòng, mỗi lần bấm ra một phòng khác. Mở phòng xong, chép link dạng meet.google.com/abc-defg-hij rồi dán vào nhé.",
    };
  }
  // Trung tâm quản lý bằng tên thật, nên giáo viên sửa tên chỉ đổi tên riêng
  // giáo viên thấy (teacher_label) — student_name giữ nguyên.
  const isTeacher = session.role === "teacher";
  if (isTeacher) setTeacherLabel(id, session.userId, studentName);
  const before = db
    .prepare("SELECT meeting_url, student_user_id, student_name, subject FROM classes WHERE id = ?")
    .get(id) as
    | { meeting_url: string | null; student_user_id: number | null; student_name: string; subject: string }
    | undefined;
  // Form nào không có ô link phòng học thì giữ link cũ, đừng xoá trắng link
  // Meet mỗi lần sửa lớp.
  const nextMeetingUrl = formData.has("meeting_url") ? meetingUrl : (before?.meeting_url ?? null);
  if (formData.has("messenger_url")) {
    const raw = String(formData.get("messenger_url") || "").trim().slice(0, 300);
    const messengerUrl = raw ? (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`) : null;
    db.prepare(`UPDATE classes SET messenger_url = ? WHERE id = ? ${isTeacher ? "AND teacher_id = ?" : ""}`).run(
      ...([messengerUrl, id, ...(isTeacher ? [session.userId] : [])] as (string | number | null)[])
    );
  }
  const result = db
    .prepare(
      `UPDATE classes SET ${isTeacher ? "" : "student_name=?, "}student_phone=?, guardian_name=?, facebook_url=?, level=?, subject=?, language=?, schedule_type=?, day_of_week=?, start_time=?, duration_minutes=?, notes=?, meeting_url=?
       WHERE id = ? ${isTeacher ? "AND teacher_id = ?" : ""}`
    )
    .run(
      ...([
        ...(isTeacher ? [] : [studentName]),
        studentPhone || null,
        guardianName || null,
        facebookUrl,
        level || null,
        subject,
        language,
        scheduleType,
        dayOfWeek,
        startTime,
        durationMinutes || 60,
        notes || null,
        nextMeetingUrl,
        id,
        ...(isTeacher ? [session.userId] : []),
      ] as (string | number | null)[])
    );

  if (result.changes === 0) {
    return { error: "Không tìm thấy lớp học hoặc bạn không có quyền sửa" };
  }

  // Vừa gắn hoặc đổi link Google Meet: gửi link cho học viên qua email.
  const email = contactEmailOf(before?.student_user_id);
  if (nextMeetingUrl && nextMeetingUrl !== before?.meeting_url && email && before) {
    queueMail({
      to: email,
      ...meetingLinkMail({ name: before.student_name, subject, meetingUrl: nextMeetingUrl }),
      dedupKey: `meet|${id}|${nextMeetingUrl}`,
    });
  }

  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${id}`);
  revalidatePath("/teacher/schedule");
  revalidatePath("/teacher");
  return { success: true };
}

/**
 * Đặt tên giáo viên tự gọi học viên cho mọi buổi trong tuần của khách mà giáo
 * viên này dạy. Trùng tên thật hoặc để trống thì xoá, quay về tên thật.
 */
function setTeacherLabel(classId: number, teacherId: number, label: string): number {
  const cls = db.prepare("SELECT student_name FROM classes WHERE id = ? AND teacher_id = ?").get(classId, teacherId) as
    | { student_name: string }
    | undefined;
  if (!cls) return 0;
  const clean = label.trim().slice(0, 80);
  const value = !clean || clean === cls.student_name ? null : clean;
  const stmt = db.prepare("UPDATE classes SET teacher_label = ? WHERE id = ? AND teacher_id = ?");
  let changed = 0;
  for (const id of customerClassIds(classId)) changed += stmt.run(value, id, teacherId).changes;
  return changed;
}

/**
 * Set (or clear) a manual baseline for a package's "sessions used" — e.g.
 * entering an old class into the system that already had N sessions before
 * today. From this moment the count becomes the baseline plus whatever gets
 * checked in afterward, so it keeps counting up on its own rather than
 * freezing. `used: null` clears the baseline and reverts to the plain
 * computed count (every completed session since the package started).
 */
export async function adjustPackageUsedAction(packageId: number, used: number | null) {
  const session = await assertRole([...MANAGE_ROLES, "teacher"]);
  if (session.role === "teacher") {
    const owned = db
      .prepare("SELECT id FROM classes WHERE package_id = ? AND teacher_id = ?")
      .get(packageId, session.userId);
    if (!owned) throw new ForbiddenError("Bạn không phụ trách lớp dùng gói này");
  }
  if (used === null) {
    db.prepare("UPDATE packages SET used_override = NULL, used_override_set_at = NULL WHERE id = ?").run(
      packageId
    );
  } else {
    db.prepare(
      "UPDATE packages SET used_override = ?, used_override_set_at = datetime('now') WHERE id = ?"
    ).run(used, packageId);
  }
  revalidatePath("/admin/classes");
  revalidatePath("/teacher");
  revalidatePath("/teacher/schedule");
}

/**
 * Đăng ký / cập nhật gói học của một lớp và ghi nhận luôn học phí đã đóng.
 * Gộp ba việc admin luôn làm cùng một lúc khi khách hàng đóng tiền: số buổi
 * đã đăng ký, số buổi đã học tính tới hiện tại, và khoản thu.
 *
 * Lớp đã có gói thì cập nhật ngay trên gói đó (không tạo gói mới) để giữ
 * nguyên các lịch học khác đang dùng chung gói.
 */
export async function saveClassPackageAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(MANAGE_ROLES);

  const classId = Number(formData.get("class_id"));
  const totalSessions = Number(formData.get("total_sessions") || 0);
  const bonusSessions = Number(formData.get("bonus_sessions") || 0);
  const courseCount = Number(formData.get("course_count") || 1);
  const usedRaw = String(formData.get("used_sessions") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const paidAt = String(formData.get("paid_at") || "");
  const note = String(formData.get("note") || "").trim();

  if (!classId || !Number.isInteger(totalSessions) || totalSessions <= 0) {
    return { error: "Vui lòng nhập số buổi đã đăng ký" };
  }
  if (!Number.isInteger(bonusSessions) || bonusSessions < 0) {
    return { error: "Số buổi tặng không hợp lệ" };
  }
  if (!Number.isInteger(courseCount) || courseCount < 1) {
    return { error: "Số khóa đã đăng ký phải từ 1 trở lên" };
  }
  // Buổi tặng cũng là buổi được học, nên mốc "đã học" tính trên tổng.
  const totalAvailable = totalSessions + bonusSessions;
  const used = usedRaw === "" ? 0 : Number(usedRaw);
  if (!Number.isInteger(used) || used < 0 || used > totalAvailable) {
    return { error: `Số buổi đã học phải từ 0 đến ${totalAvailable}` };
  }
  if (amount < 0 || Number.isNaN(amount)) return { error: "Số tiền không hợp lệ" };
  if (amount > 0) {
    if (!MANAGE_ROLES.includes(session.role)) return { error: "Chỉ Quản lý trở lên mới ghi nhận được học phí" };
    if (!paidAt) return { error: "Vui lòng chọn ngày đóng học phí" };
  }

  const cls = db.prepare("SELECT package_id FROM classes WHERE id = ?").get(classId) as
    | { package_id: number | null }
    | undefined;
  if (!cls) return { error: "Không tìm thấy lớp học" };

  db.transaction(() => {
    let packageId = cls.package_id;
    if (packageId) {
      db.prepare(
        "UPDATE packages SET total_sessions = ?, bonus_sessions = ?, course_count = ? WHERE id = ?"
      ).run(totalSessions, bonusSessions, courseCount, packageId);
    } else {
      const info = db
        .prepare(
          "INSERT INTO packages (total_sessions, bonus_sessions, course_count, started_at) VALUES (?, ?, ?, ?)"
        )
        .run(totalSessions, bonusSessions, courseCount, todayISO());
      packageId = Number(info.lastInsertRowid);
      db.prepare("UPDATE classes SET package_id = ? WHERE id = ?").run(packageId, classId);
    }
    // Chỉ ghi mốc "đã học" khi con số admin nhập khác với số đang đếm được —
    // lưu mà không sửa gì thì gói vẫn tự đếm theo điểm danh như cũ, không bị
    // đánh dấu là chỉnh tay. Số buổi đã học là một cái MỐC, không phải con số
    // đóng băng: các buổi điểm danh ghi sau thời điểm này cộng tiếp lên trên.
    const counted = getPackageProgressBatch([packageId]).get(packageId)?.used ?? 0;
    if (used !== counted) {
      db.prepare(
        "UPDATE packages SET used_override = ?, used_override_set_at = datetime('now') WHERE id = ?"
      ).run(used, packageId);
    }
    if (amount > 0) {
      db.prepare(
        "INSERT INTO payments (class_id, amount, paid_at, note, recorded_by) VALUES (?, ?, ?, ?, ?)"
      ).run(classId, amount, paidAt, note || null, session.userId);
    }
  })();

  // Khách đóng tiền = chốt lớp. Trước đây chỉ đường ghi tiền ở trang Doanh thu
  // mới cộng thưởng, còn ghi ngay ở đây (đường hay dùng nhất) thì nhân viên
  // đặt hẹn mất trắng khoản thưởng.
  if (amount > 0) awardConversionForClass(classId, paidAt);

  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin/finance");
  revalidatePath("/teacher");
  return { success: true };
}

export async function setPackageAction(classId: number, totalSessions: number | null) {
  await assertRole(MANAGE_ROLES);
  if (!totalSessions) {
    db.prepare("UPDATE classes SET package_id = NULL WHERE id = ?").run(classId);
  } else {
    const info = db
      .prepare("INSERT INTO packages (total_sessions, started_at) VALUES (?, ?)")
      .run(totalSessions, todayISO());
    db.prepare("UPDATE classes SET package_id = ? WHERE id = ?").run(info.lastInsertRowid, classId);
  }
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
}

/** Reset the package's counting start date to today — used when a student renews/buys a new round of the same package. Resets for every class sharing this pool. */
export async function renewPackageAction(packageId: number, totalSessions: number) {
  await assertRole(MANAGE_ROLES);
  db.prepare("UPDATE packages SET total_sessions = ?, started_at = ? WHERE id = ?").run(
    totalSessions,
    todayISO(),
    packageId
  );
  revalidatePath("/admin/classes");
}

/** Attach this class to another class's existing package pool (student who studies 2-3 buổi/tuần sharing one gói học). */
export async function sharePackageAction(classId: number, sourceClassId: number) {
  await assertRole(MANAGE_ROLES);
  const source = db.prepare("SELECT package_id FROM classes WHERE id = ?").get(sourceClassId) as
    | { package_id: number | null }
    | undefined;
  if (!source?.package_id) return;
  db.prepare("UPDATE classes SET package_id = ? WHERE id = ?").run(source.package_id, classId);
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
}

export async function linkStudentAccountAction(classId: number, studentUserId: number | null) {
  await assertRole(MANAGE_ROLES);
  db.prepare("UPDATE classes SET student_user_id = ? WHERE id = ?").run(studentUserId, classId);
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
}

export async function assignTeacherAction(classId: number, teacherId: number | null) {
  await assertRole(MANAGE_ROLES);
  // Only a class that had no teacher yet counts as "được giao lớp mới" — a
  // straight swap to a different teacher on an ongoing class is a routine
  // reassignment, not a new assignment, and shouldn't notify or re-arm the
  // trial-session flag on whatever session comes next.
  const before = db.prepare("SELECT teacher_id FROM classes WHERE id = ?").get(classId) as
    | { teacher_id: number | null }
    | undefined;
  db.prepare("UPDATE classes SET teacher_id = ? WHERE id = ?").run(teacherId, classId);
  if (teacherId && !before?.teacher_id) {
    const cls = getClass(classId);
    if (cls) {
      notifyTeacherOfAssignment({
        teacherId,
        classId,
        studentName: cls.student_name,
        subject: cls.subject,
        schedules: [formatClassSchedule(cls)],
      });
    }
  }
  revalidatePath("/admin/classes");
  revalidatePath("/admin/assign");
  revalidatePath(`/admin/classes/${classId}`);
}

/**
 * Đổi trạng thái nghiệp vụ của lớp. `status` (Đang học/Tạm dừng/Đã kết thúc)
 * luôn được đặt theo stage chứ không nhận riêng, nên lịch dạy và điểm danh
 * không bao giờ lệch với trạng thái đang hiện trên màn hình.
 *
 * Ngày học lại chỉ giữ khi stage đúng là một trạng thái Tạm OFF — chuyển sang
 * trạng thái khác thì xoá luôn, khỏi còn cảnh báo mồ côi.
 */
/**
 * Các buổi khác trong tuần của cùng khách, cùng môn, đang cùng trạng thái với
 * lớp này — đổi trạng thái thì đổi cả nhóm. Buổi đã bị "Ngừng" riêng (khách
 * bỏ một buổi trong tuần) có trạng thái khác nên không bị kéo theo.
 */
function stageSiblingIds(classId: number): number[] {
  const cls = getClass(classId);
  if (!cls) return [];
  return listSiblingClasses(cls)
    .filter((s) => s.subject === cls.subject && s.stage === cls.stage)
    .map((s) => s.id);
}

/** Hai bước "đang thử" của một khách mới. */
const TRIAL_STAGES = ["trial", "trial_awaiting_fee"];

export async function setClassStageAction(
  classId: number,
  stage: string,
  pausedUntil?: string | null,
  /** Lịch học xếp luôn lúc cho lớp học lại; bỏ trống thì giữ nguyên lịch cũ. */
  schedule?: { dayOfWeek: number; startTime: string; startDate?: string } | null
) {
  await assertRole(MANAGE_ROLES);
  const info = classStage(stage);
  const before = db.prepare("SELECT stage FROM classes WHERE id = ?").get(classId) as
    | { stage: string }
    | undefined;
  // Khách học nhiều buổi/tuần là nhiều dòng lớp. Cho Tạm OFF mà chỉ đổi đúng
  // một buổi thì các buổi kia vẫn nằm trong lịch giáo viên. Nên đổi luôn các
  // buổi cùng khách, cùng môn đang chung trạng thái với buổi này.
  const ids = [classId, ...stageSiblingIds(classId)];
  const update = db.prepare("UPDATE classes SET stage = ?, status = ?, paused_until = ? WHERE id = ?");
  for (const id of ids) {
    update.run(info.value, info.status, info.paused ? pausedUntil || null : null, id);
  }
  // "Chốt lớp": khách đang ở bước học thử chuyển sang đi học chính thức. Quy
  // tắc thưởng là chốt lớp HOẶC đóng tiền, nên đổi trạng thái thôi cũng đủ —
  // khách đóng tiền sau thì cùng khoá chống trùng, không ghi lần hai. Chỉ tính
  // khi đi ra từ bước học thử, để việc sửa nhãn cho lớp cũ không sinh thưởng.
  // Cũng tính khi lớp đã có buổi học thử dạy xong, dù bước trước không phải
  // "Học thử" (VD Học thử → Tạm OFF → Đang học): khách vẫn là khách mới chốt.
  if (before && CONVERTED_STAGES.includes(info.value)) {
    const hadTrial =
      TRIAL_STAGES.includes(before.stage) ||
      !!db
        .prepare("SELECT 1 FROM attendance WHERE class_id = ? AND is_trial = 1 AND status = 'completed' LIMIT 1")
        .get(classId);
    if (hadTrial) awardConversionForClass(classId, todayISO());
  }
  // Lớp Tạm OFF nhập từ Excel không có ngày/giờ. Chỉ bật lại trạng thái thôi
  // thì lớp "đang học" mà không nằm trong lịch tuần nào — giáo viên không thấy,
  // không ai điểm danh, lớp thành vô hình. Nên lúc cho học lại thì xếp lịch luôn.
  if (schedule && schedule.startTime) {
    // Chọn ngày cụ thể thì thứ lấy theo ngày đó, và lịch chỉ chạy từ ngày đó.
    const startDate = schedule.startDate && /^\d{4}-\d{2}-\d{2}$/.test(schedule.startDate) ? schedule.startDate : null;
    const dayOfWeek = startDate ? new Date(`${startDate}T00:00:00`).getDay() : schedule.dayOfWeek;
    if (!Number.isNaN(dayOfWeek)) {
      db.prepare(
        "UPDATE classes SET schedule_type = 'fixed', day_of_week = ?, start_time = ?, start_date = ? WHERE id = ?"
      ).run(dayOfWeek, schedule.startTime, startDate, classId);
    }
  }
  revalidatePath("/admin/cham-khach");
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin");
  revalidatePath("/teacher");
  revalidatePath("/teacher/schedule");
  revalidatePath("/student");
}

export async function deleteClassAction(classId: number) {
  const session = await assertRole([...MANAGE_ROLES, "teacher"]);
  const doomed = getClass(classId);
  const result = db
    .prepare(
      `DELETE FROM classes WHERE id = ? ${session.role === "teacher" ? "AND teacher_id = ?" : ""}`
    )
    .run(...(session.role === "teacher" ? [classId, session.userId] : [classId]));
  if (result.changes === 0 && session.role === "teacher") {
    throw new ForbiddenError("Không tìm thấy lớp học hoặc bạn không có quyền xoá");
  }
  if (result.changes > 0 && doomed) {
    logAudit(
      session,
      "lop_hoc",
      `Xoá hẳn lớp ${doomed.subject} của ${doomed.student_name} (${formatClassSchedule(doomed)})`
    );
  }
  revalidatePath("/admin/classes");
  revalidatePath("/admin/assign");
  revalidatePath("/teacher/schedule");
  revalidatePath("/teacher");
}

/**
 * Gán (hoặc gỡ) giáo vụ phụ trách cho một lớp CÓ SẴN.
 *
 * Trước đây giáo vụ chỉ được gán đúng lúc tạo lớp, nên lớp cũ và lớp nhập từ
 * Excel không bao giờ sinh thưởng. Ai được gán quyết định tiền thưởng chảy về
 * đâu, nên chỉ Quản lý trở lên được bấm, và lần nào cũng ghi nhật ký.
 */
export async function setClassCoordinatorAction(
  classId: number,
  coordinatorId: number | null
): Promise<{ movedCount: number; movedTotal: number }> {
  const session = await assertRole(MANAGE_ROLES);

  const cls = db.prepare("SELECT id, student_name FROM classes WHERE id = ?").get(classId) as
    | { id: number; student_name: string }
    | undefined;
  if (!cls) throw new ForbiddenError("Không tìm thấy lớp");

  let staffName = "không ai";
  if (coordinatorId != null) {
    const staff = db
      .prepare(
        "SELECT id, name FROM users WHERE id = ? AND role IN ('admin','manager','coordinator') AND active = 1"
      )
      .get(coordinatorId) as { id: number; name: string } | undefined;
    if (!staff) throw new ForbiddenError("Người được gán không phải nhân sự quản lý");
    staffName = staff.name;
  }

  // Khách học nhiều buổi/tuần là nhiều dòng lớp chung một gói — gán cho cả
  // khách, không phải cho riêng buổi đang mở. Chỉ gán một dòng thì buổi học
  // thử nằm ở buổi kia vẫn ghi cho người cũ.
  for (const id of customerClassIds(classId)) {
    db.prepare("UPDATE classes SET coordinator_id = ? WHERE id = ?").run(coordinatorId, id);
  }

  // Gán lại là để SỬA người nhận thưởng, nên các khoản đã ghi của khách này
  // (học thử của lớp, chốt lớp theo lớp hoặc theo gói) phải đi theo người mới.
  // Không chuyển thì chủ trung tâm tạo lớp, khách chốt, rồi mới gán nhân viên
  // → tiền vẫn nằm ở tài khoản chủ trung tâm, còn trang Thưởng không báo sót
  // vì "đã có khoản rồi".
  let moved = { n: 0, total: 0 };
  if (coordinatorId != null) {
    moved = transferClassBonuses(classId, coordinatorId);
  }
  logAudit(
    session,
    "luong",
    `Gán giáo vụ phụ trách lớp ${cls.student_name}: ${staffName}` +
      (moved.n > 0 ? ` — chuyển ${moved.n} khoản thưởng (${formatVND(moved.total)}) sang người này` : "")
  );
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin/thuong");
  return { movedCount: moved.n, movedTotal: moved.total };
}

/**
 * Ghi các khoản thưởng còn thiếu của một khách cho người phụ trách hiện tại —
 * nút trong khung "Thưởng của khách này" ở trang lớp.
 */
export async function awardMissingForClassAction(classId: number): Promise<{ trials: number; conversion: number }> {
  const session = await assertRole(MANAGE_ROLES);
  const r = awardMissingForCustomer(classId);
  const cls = getClass(classId);
  if (r.trials + r.conversion > 0) {
    logAudit(
      session,
      "luong",
      `Ghi bù thưởng cho khách ${cls?.student_name ?? `#${classId}`}: ${r.trials} học thử, ${r.conversion} chốt lớp`
    );
  }
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin/thuong");
  return r;
}

/**
 * Giáo viên gỡ lịch khách học thử xong mà không học tiếp: chuyển khách sang
 * "Rớt lớp" (đã kết thúc), cả các buổi khác trong tuần của khách — lịch dạy,
 * nhắc lịch, "quên điểm danh" đều thôi hiện. Lịch sử buổi học thử (và tiền
 * công 50k) vẫn giữ nguyên.
 *
 * Chỉ cho khách đang ở bước học thử, hoặc đã có buổi học thử mà chưa học buổi
 * chính thức nào — khách đã học chính thức thì cho nghỉ là việc của trung tâm.
 */
export async function teacherDropTrialAction(classId: number): Promise<{ error?: string }> {
  const session = await assertRole(["teacher"]);
  const cls = getClass(classId);
  if (!cls || cls.teacher_id !== session.userId) return { error: "Không tìm thấy lớp của bạn" };

  const ids = [classId, ...stageSiblingIds(classId)];
  const ph = ids.map(() => "?").join(",");
  const { trials, regular } = db
    .prepare(
      `SELECT SUM(CASE WHEN is_trial = 1 AND status = 'completed' THEN 1 ELSE 0 END) AS trials,
              SUM(CASE WHEN is_trial = 0 AND (status = 'completed' OR counts_as_used = 1) THEN 1 ELSE 0 END) AS regular
         FROM attendance WHERE class_id IN (${ph})`
    )
    .get(...ids) as { trials: number | null; regular: number | null };
  const eligible = TRIAL_STAGES.includes(cls.stage) || ((trials ?? 0) > 0 && !regular);
  if (!eligible) {
    return { error: "Khách đã học buổi chính thức — nhắn trung tâm để cho khách nghỉ nhé." };
  }

  const info = classStage("dropped");
  const update = db.prepare(
    "UPDATE classes SET stage = ?, status = ?, paused_until = NULL WHERE id = ? AND teacher_id = ?"
  );
  for (const id of ids) update.run(info.value, info.status, id, session.userId);
  logAudit(
    session,
    "lop_hoc",
    `Giáo viên gỡ lịch ${cls.student_name} (${cls.subject}) — học thử xong không học tiếp`
  );
  revalidateClassViews(classId);
  revalidatePath("/teacher", "layout");
  return {};
}

/**
 * Giáo viên xếp lịch theo tháng cho lớp linh động: thay toàn bộ buổi hẹn từ
 * hôm nay tới cuối tháng `month` (YYYY-MM) bằng danh sách mới. Buổi đã qua
 * giữ nguyên làm lịch sử. Buổi hẹn hiện ở "Hôm nay", nhắc lịch, trang khách,
 * và nhắc "quên điểm danh" nếu qua ngày mà chưa điểm danh.
 */
export async function savePlannedSessionsAction(
  classId: number,
  month: string,
  entries: { date: string; time: string }[]
): Promise<{ error?: string }> {
  const session = await assertRole([...MANAGE_ROLES, "teacher"]);
  const cls = getClass(classId);
  if (!cls || (session.role === "teacher" && cls.teacher_id !== session.userId)) {
    return { error: "Không tìm thấy lớp của bạn" };
  }
  if (cls.schedule_type !== "flexible") return { error: "Chỉ xếp lịch tháng cho lớp linh động" };
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Tháng không hợp lệ" };

  const today = todayISO();
  const clean = new Map<string, string>();
  for (const e of entries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !e.date.startsWith(month) || e.date < today) continue;
    if (Number.isNaN(new Date(`${e.date}T00:00:00`).getTime())) continue;
    if (!/^\d{2}:\d{2}$/.test(e.time)) return { error: `Chọn giờ học cho ngày ${e.date.split("-").reverse().join("/")}` };
    clean.set(e.date, e.time);
  }

  db.transaction(() => {
    db.prepare(
      "DELETE FROM planned_sessions WHERE class_id = ? AND session_date LIKE ? AND session_date >= ?"
    ).run(classId, `${month}-%`, today);
    const ins = db.prepare("INSERT INTO planned_sessions (class_id, session_date, start_time) VALUES (?, ?, ?)");
    for (const [date, time] of clean) ins.run(classId, date, time);
  })();

  logAudit(session, "lop_hoc", `Xếp lịch tháng ${month.slice(5)}/${month.slice(0, 4)} cho ${cls.student_name}: ${clean.size} buổi`);
  revalidatePath("/teacher", "layout");
  revalidatePath("/admin");
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/student");
  return {};
}
