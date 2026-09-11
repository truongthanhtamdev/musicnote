"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole, ForbiddenError } from "@/lib/guard";
import { normalizeFacebookUrl, todayISO } from "@/lib/format";
import {
  notifyUser,
  getClass,
  getPackageProgressBatch,
  isTeacherAvailable,
} from "@/lib/queries";
import { classStage, formatClassSchedule, type ClassRow } from "@/lib/types";
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

export async function createClassAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(["admin", "coordinator", "teacher"]);

  const studentName = String(formData.get("student_name") || "").trim();
  const studentPhone = String(formData.get("student_phone") || "").trim();
  const guardianName = String(formData.get("guardian_name") || "").trim();
  const facebookUrl = normalizeFacebookUrl(String(formData.get("facebook_url") || ""));
  const level = String(formData.get("level") || "").trim();
  const subject = String(formData.get("subject") || "").trim() || "Guitar";
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

  const insert = db.prepare(
    `INSERT INTO classes (student_name, student_phone, guardian_name, facebook_url, level, subject, language, source, package_id, schedule_type, day_of_week, start_time, duration_minutes, teacher_id, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
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
      notes || null
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

  revalidatePath("/admin/classes");
  revalidatePath("/admin/assign");
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
  const session = await assertRole(["admin", "coordinator", "teacher"]);

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
  const session = await assertRole(["admin", "coordinator", "teacher"]);
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
      "Buổi này đã có lịch sử điểm danh — đổi trạng thái lớp thay vì xoá để giữ lịch sử"
    );
  }

  db.prepare("DELETE FROM classes WHERE id = ?").run(slotClassId);
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
  const session = await assertRole(["admin", "coordinator", "teacher"]);

  const id = Number(formData.get("id"));
  const studentName = String(formData.get("student_name") || "").trim();
  const studentPhone = String(formData.get("student_phone") || "").trim();
  const guardianName = String(formData.get("guardian_name") || "").trim();
  const facebookUrl = normalizeFacebookUrl(String(formData.get("facebook_url") || ""));
  const level = String(formData.get("level") || "").trim();
  const subject = String(formData.get("subject") || "").trim() || "Guitar";
  const language = String(formData.get("language") || "vi") === "en" ? "en" : "vi";
  const scheduleType = String(formData.get("schedule_type") || "fixed") === "flexible" ? "flexible" : "fixed";
  const dayOfWeek = scheduleType === "flexible" ? -1 : Number(formData.get("day_of_week"));
  const startTime = scheduleType === "flexible" ? "" : String(formData.get("start_time") || "");
  const durationMinutes = Number(formData.get("duration_minutes") || 60);
  const notes = String(formData.get("notes") || "").trim();

  if (!id || !studentName || (scheduleType === "fixed" && (Number.isNaN(dayOfWeek) || !startTime))) {
    return { error: "Vui lòng nhập đầy đủ thông tin lớp học" };
  }

  const result = db
    .prepare(
      `UPDATE classes SET student_name=?, student_phone=?, guardian_name=?, facebook_url=?, level=?, subject=?, language=?, schedule_type=?, day_of_week=?, start_time=?, duration_minutes=?, notes=?
       WHERE id = ? ${session.role === "teacher" ? "AND teacher_id = ?" : ""}`
    )
    .run(
      ...([
        studentName,
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
        id,
        ...(session.role === "teacher" ? [session.userId] : []),
      ] as (string | number | null)[])
    );

  if (result.changes === 0) {
    return { error: "Không tìm thấy lớp học hoặc bạn không có quyền sửa" };
  }

  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${id}`);
  revalidatePath("/teacher/schedule");
  revalidatePath("/teacher");
  return { success: true };
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
  const session = await assertRole(["admin", "coordinator", "teacher"]);
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
  const session = await assertRole(["admin", "coordinator"]);

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
    if (session.role !== "admin") return { error: "Chỉ admin mới ghi nhận được học phí" };
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
      db.prepare("INSERT INTO payments (class_id, amount, paid_at, note) VALUES (?, ?, ?, ?)").run(
        classId,
        amount,
        paidAt,
        note || null
      );
    }
  })();

  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin/finance");
  revalidatePath("/teacher");
  return { success: true };
}

export async function setPackageAction(classId: number, totalSessions: number | null) {
  await assertRole(["admin", "coordinator"]);
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
  await assertRole(["admin", "coordinator"]);
  db.prepare("UPDATE packages SET total_sessions = ?, started_at = ? WHERE id = ?").run(
    totalSessions,
    todayISO(),
    packageId
  );
  revalidatePath("/admin/classes");
}

/** Attach this class to another class's existing package pool (student who studies 2-3 buổi/tuần sharing one gói học). */
export async function sharePackageAction(classId: number, sourceClassId: number) {
  await assertRole(["admin", "coordinator"]);
  const source = db.prepare("SELECT package_id FROM classes WHERE id = ?").get(sourceClassId) as
    | { package_id: number | null }
    | undefined;
  if (!source?.package_id) return;
  db.prepare("UPDATE classes SET package_id = ? WHERE id = ?").run(source.package_id, classId);
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
}

export async function linkStudentAccountAction(classId: number, studentUserId: number | null) {
  await assertRole(["admin", "coordinator"]);
  db.prepare("UPDATE classes SET student_user_id = ? WHERE id = ?").run(studentUserId, classId);
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
}

export async function assignTeacherAction(classId: number, teacherId: number | null) {
  await assertRole(["admin", "coordinator"]);
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
export async function setClassStageAction(
  classId: number,
  stage: string,
  pausedUntil?: string | null,
  /** Lịch học xếp luôn lúc cho lớp học lại; bỏ trống thì giữ nguyên lịch cũ. */
  schedule?: { dayOfWeek: number; startTime: string } | null
) {
  await assertRole(["admin", "coordinator"]);
  const info = classStage(stage);
  db.prepare("UPDATE classes SET stage = ?, status = ?, paused_until = ? WHERE id = ?").run(
    info.value,
    info.status,
    info.paused ? pausedUntil || null : null,
    classId
  );
  // Lớp Tạm OFF nhập từ Excel không có ngày/giờ. Chỉ bật lại trạng thái thôi
  // thì lớp "đang học" mà không nằm trong lịch tuần nào — giáo viên không thấy,
  // không ai điểm danh, lớp thành vô hình. Nên lúc cho học lại thì xếp lịch luôn.
  if (schedule && schedule.startTime && !Number.isNaN(schedule.dayOfWeek)) {
    db.prepare(
      "UPDATE classes SET schedule_type = 'fixed', day_of_week = ?, start_time = ? WHERE id = ?"
    ).run(schedule.dayOfWeek, schedule.startTime, classId);
  }
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin");
  revalidatePath("/teacher");
  revalidatePath("/teacher/schedule");
  revalidatePath("/student");
}

export async function deleteClassAction(classId: number) {
  const session = await assertRole(["admin", "teacher"]);
  const result = db
    .prepare(
      `DELETE FROM classes WHERE id = ? ${session.role === "teacher" ? "AND teacher_id = ?" : ""}`
    )
    .run(...(session.role === "teacher" ? [classId, session.userId] : [classId]));
  if (result.changes === 0 && session.role === "teacher") {
    throw new ForbiddenError("Không tìm thấy lớp học hoặc bạn không có quyền xoá");
  }
  revalidatePath("/admin/classes");
  revalidatePath("/admin/assign");
  revalidatePath("/teacher/schedule");
  revalidatePath("/teacher");
}
