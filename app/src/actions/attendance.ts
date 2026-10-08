"use server";

import crypto from "crypto";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { nowHHMM, todayISO } from "@/lib/format";
import { assertRole } from "@/lib/guard";
import {
  baselineForStatedNumber,
  findTwinCheckin,
  getAttendance,
  getClass,
  sessionPoolClassIds,
} from "@/lib/queries";
import { ATTENDANCE_STATUS_LABELS, hasRescheduleInfo, type AttendanceStatus, MANAGE_ROLES } from "@/lib/types";
import { logAudit } from "@/lib/audit";
import { awardTrialBonus } from "@/lib/bonus";
import type { FormState } from "./teachers";

const VALID_STATUS: AttendanceStatus[] = [
  "completed",
  "teacher_absent",
  "student_absent",
  "rescheduled",
];

/**
 * Reads the "Buổi thứ mấy" box. Blank means "leave the counting alone";
 * a number (0 for a trial) is the teacher stating where this session sits.
 */
/**
 * Ô tick "Đây là buổi học thử": "1"/"0" khi form có ô này, null khi không có
 * (form cũ) — lúc đó vẫn theo quy ước cũ "buổi thứ 0 là học thử".
 */
function readStatedTrial(formData: FormData): boolean | null {
  const raw = formData.get("is_trial");
  return raw === null ? null : raw === "1";
}

/** Gộp ô tick học thử với ô "buổi thứ mấy" thành một con số mốc (0 = học thử). */
function effectiveSessionNumber(formData: FormData): number | null {
  const trial = readStatedTrial(formData);
  if (trial === true) return 0;
  const n = readStatedSessionNumber(formData);
  // Bỏ tick học thử mà vẫn để số 0 thì coi như chưa nói số buổi.
  return trial === false && n === 0 ? null : n;
}

function readStatedSessionNumber(formData: FormData): number | null {
  const raw = String(formData.get("session_number") ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Giáo viên/giáo vụ điền "buổi thứ mấy" cho một buổi điểm danh: ghi mốc đếm
 * sao cho đúng buổi đó mang số này, các buổi sau tự nhảy tiếp từ đây.
 */
function applyStatedSessionNumber(attendanceId: number, stated: number) {
  // Buổi học thử (0) không phải mốc đếm gói: đặt mốc 0 là đếm lại cả khoá từ đầu.
  if (stated === 0) return;
  const target = baselineForStatedNumber(attendanceId, stated);
  if (!target) return;
  if (target.packageId) {
    db.prepare(
      "UPDATE packages SET used_override = ?, used_override_set_at = datetime('now') WHERE id = ?"
    ).run(target.value, target.packageId);
  } else {
    // Lớp không theo gói: ghi mốc ngay trên lớp, để buổi sau ô "Buổi thứ mấy"
    // tự nhảy tiếp từ số giáo viên vừa điền.
    db.prepare(
      "UPDATE classes SET used_override = ?, used_override_set_at = datetime('now') WHERE id = ?"
    ).run(target.value, target.classId);
  }
}

export async function markAttendanceAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(["teacher"]);

  const classId = Number(formData.get("class_id"));
  const sessionDate = String(formData.get("session_date") || "");
  const status = String(formData.get("status") || "completed") as AttendanceStatus;
  const fbConfirmed = formData.get("fb_checkin_confirmed") ? 1 : 0;
  const lessonContent = String(formData.get("lesson_content") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const rescheduledToDate =
    hasRescheduleInfo(status) ? String(formData.get("rescheduled_to_date") || "").trim() : "";
  const rescheduledToTime =
    hasRescheduleInfo(status) ? String(formData.get("rescheduled_to_time") || "").trim() : "";
  // "Buổi thứ mấy": prefilled with what the system counts, editable. 0 is how
  // the teacher says "this one is the trial". Left blank = keep counting
  // automatically and leave the trial flag alone.
  const statedSessionNumber = effectiveSessionNumber(formData);
  const statedTrial = readStatedTrial(formData);
  // "Khách không báo trước" — chỉ hỏi khi học viên vắng, vì đó là lúc duy nhất
  // buổi vừa không dạy được vừa có thể tính tiết. Trạng thái khác luôn về 0 để
  // sửa từ "HS vắng" sang trạng thái khác là hết tính.
  const countsAsUsed = status === "student_absent" && formData.get("counts_as_used") ? 1 : 0;

  if (!classId || !sessionDate || !VALID_STATUS.includes(status)) {
    return { error: "Dữ liệu điểm danh không hợp lệ" };
  }

  const owned = db
    .prepare("SELECT trial_pending, package_id FROM classes WHERE id = ? AND teacher_id = ?")
    .get(classId, session.userId) as
    | { trial_pending: number; package_id: number | null }
    | undefined;
  if (!owned) {
    return { error: "Bạn không phụ trách lớp này" };
  }

  const existing = getAttendance(classId, sessionDate);
  const nowStr = nowHHMM();

  if (existing) {
    // is_trial isn't in this SET list on purpose — it follows "buổi thứ mấy"
    // (updated separately below when the teacher states one), so a
    // correction that leaves that box alone keeps whatever was saved.
    db.prepare(
      `UPDATE attendance SET status=?, fb_checkin_confirmed=?, lesson_content=?, note=?, rescheduled_to_date=?, rescheduled_to_time=?, counts_as_used=?, check_out_time=? WHERE id=?`
    ).run(
      status,
      fbConfirmed,
      lessonContent || null,
      note || null,
      rescheduledToDate || null,
      rescheduledToTime || null,
      countsAsUsed,
      nowStr,
      existing.id
    );
    if (statedTrial !== null || statedSessionNumber !== null) {
      // Ô tick học thử quyết định; form cũ không có ô thì theo "buổi thứ 0".
      const trial = statedTrial !== null ? statedTrial : statedSessionNumber === 0;
      db.prepare("UPDATE attendance SET is_trial = ? WHERE id = ?").run(trial ? 1 : 0, existing.id);
    }
  } else {
    // Một khách bị nhập thành hai lớp trùng giờ (lớp học thử + lớp khoá, hay
    // giáo viên tự thêm lại lớp trung tâm đã giao): điểm danh cả hai là một
    // tiết bị tính thành hai tiết lương và trừ hai tiết của khách.
    const twin = findTwinCheckin(classId, sessionDate);
    if (twin) {
      return {
        error: `Buổi này của khách đã được điểm danh ở một lớp khác cùng giờ${
          twin.teacher_name ? ` (${twin.teacher_name})` : ""
        } — không cần điểm danh lần nữa. Nếu đây là lớp bị trùng, báo trung tâm để gỡ bớt.`,
      };
    }
    // Trial status isn't a manual checkbox. The teacher writing "buổi 0"
    // says so outright; otherwise it auto-fires for a class's very first
    // recorded session, but only when trial_pending was set by the center
    // actually assigning the class to a teacher (never for a teacher's own
    // self-added/backfilled classes). Either way the flag is consumed here,
    // so only one session per assignment can count as the trial.
    const isTrial =
      statedTrial !== null
        ? statedTrial
          ? 1
          : 0
        : statedSessionNumber !== null
          ? statedSessionNumber === 0
            ? 1
            : 0
          : owned.trial_pending
            ? 1
            : 0;
    if (owned.trial_pending) {
      db.prepare("UPDATE classes SET trial_pending = 0 WHERE id = ?").run(classId);
    }
    // Điểm danh sau ngày học là "điểm danh bù": ghi lại để bảng lương áp quy
    // định số lần được tha. Chỉ đánh dấu lúc tạo mới — sửa lại bản ghi cũ sau
    // này không biến nó thành buổi bù.
    const lateCheckin = sessionDate < todayISO() ? 1 : 0;
    db.prepare(
      `INSERT INTO attendance (class_id, teacher_id, session_date, status, check_in_time, check_out_time, fb_checkin_confirmed, lesson_content, is_trial, note, rescheduled_to_date, rescheduled_to_time, counts_as_used, late_checkin, rating_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      classId,
      session.userId,
      sessionDate,
      status,
      nowStr,
      nowStr,
      fbConfirmed,
      lessonContent || null,
      isTrial,
      note || null,
      rescheduledToDate || null,
      rescheduledToTime || null,
      countsAsUsed,
      lateCheckin,
      // Sinh sẵn mã link chấm sao ngay lúc điểm danh, để giáo vụ gửi cho khách
      // được liền sau buổi học.
      crypto.randomBytes(9).toString("base64url")
    );
  }

  // Ghi thưởng cho giáo vụ nếu đây là buổi học thử đã dạy xong. Neo vào dòng
  // điểm danh nên sửa đi sửa lại cũng chỉ thưởng một lần.
  const saved = db
    .prepare("SELECT id FROM attendance WHERE class_id = ? AND session_date = ?")
    .get(classId, sessionDate) as { id: number } | undefined;
  if (saved) awardTrialBonus(saved.id);

  if (saved && statedSessionNumber !== null) applyStatedSessionNumber(saved.id, statedSessionNumber);

  revalidatePath("/teacher");
  revalidatePath("/teacher/attendance");
  revalidatePath("/teacher/schedule");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin");
  revalidatePath("/admin/classes");
  return { success: true };
}

export async function correctAttendanceAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(MANAGE_ROLES);

  const id = Number(formData.get("id"));
  const status = String(formData.get("status") || "") as AttendanceStatus;
  const lessonContent = String(formData.get("lesson_content") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const rescheduledToDate =
    hasRescheduleInfo(status) ? String(formData.get("rescheduled_to_date") || "").trim() : "";
  const rescheduledToTime =
    hasRescheduleInfo(status) ? String(formData.get("rescheduled_to_time") || "").trim() : "";
  const statedSessionNumber = effectiveSessionNumber(formData);
  const statedTrial = readStatedTrial(formData);
  const countsAsUsed = status === "student_absent" && formData.get("counts_as_used") ? 1 : 0;

  if (!id || !VALID_STATUS.includes(status)) {
    return { error: "Dữ liệu không hợp lệ" };
  }

  const existing = db
    .prepare("SELECT class_id, is_trial FROM attendance WHERE id = ?")
    .get(id) as { class_id: number; is_trial: number } | undefined;
  if (!existing) {
    return { error: "Không tìm thấy buổi điểm danh này" };
  }

  // The session number is what says whether this is a trial: 0 means it is,
  // anything else means it isn't. Leaving the box blank keeps what was saved.
  const isTrial =
    statedTrial !== null
      ? statedTrial
        ? 1
        : 0
      : statedSessionNumber !== null
        ? statedSessionNumber === 0
          ? 1
          : 0
        : existing.is_trial;

  db.prepare(
    `UPDATE attendance SET status = ?, lesson_content = ?, is_trial = ?, note = ?, rescheduled_to_date = ?, rescheduled_to_time = ?, counts_as_used = ? WHERE id = ?`
  ).run(
    status,
    lessonContent || null,
    isTrial,
    note || null,
    rescheduledToDate || null,
    rescheduledToTime || null,
    countsAsUsed,
    id
  );

  if (statedSessionNumber !== null) {
    applyStatedSessionNumber(id, statedSessionNumber);
  }

  // Sửa thành buổi học thử đã dạy xong thì cũng phải ghi thưởng — trước đây
  // chỉ lúc giáo viên tự điểm danh mới ghi, Quản lý sửa lại thì mất.
  awardTrialBonus(id);

  // Sửa điểm danh là sửa cả tiền công giáo viên lẫn số tiết còn lại của
  // khách, nên phải ghi lại ai sửa.
  const cls = getClass(existing.class_id);
  logAudit(
    session,
    "diem_danh",
    `Sửa điểm danh lớp ${cls?.subject ?? ""} của ${cls?.student_name ?? `#${existing.class_id}`}` +
      ` thành "${ATTENDANCE_STATUS_LABELS[status]}"` +
      (statedSessionNumber !== null ? ` · buổi thứ ${statedSessionNumber}` : "")
  );

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/classes");
  revalidatePath("/teacher");
  revalidatePath("/teacher/attendance");
  return { success: true };
}

/**
 * Giáo viên bấm "Đã gửi lên Messenger" sau khi dán tin điểm danh vào nhóm lớp:
 * đánh dấu buổi đó đã có bản backup trên Messenger.
 */
export async function confirmMessengerBackupAction(classId: number, sessionDate: string) {
  const session = await assertRole(["teacher", ...MANAGE_ROLES]);
  const isTeacher = session.role === "teacher";
  db.prepare(
    `UPDATE attendance SET fb_checkin_confirmed = 1
      WHERE class_id = ? AND session_date = ?
        ${isTeacher ? "AND class_id IN (SELECT id FROM classes WHERE teacher_id = ?)" : ""}`
  ).run(...([classId, sessionDate, ...(isTeacher ? [session.userId] : [])] as (string | number)[]));
  revalidatePath("/teacher");
  revalidatePath("/teacher/attendance");
  revalidatePath("/admin/attendance");
}

/**
 * Xoá một dòng điểm danh — để gỡ buổi bị điểm danh trùng (một khách nhập
 * thành hai lớp, giáo viên điểm danh cả hai). Chỉ Quản lý trở lên.
 *
 * Nếu buổi đó đã nằm trong mốc "đã học tới buổi mấy" thì mốc cũng lùi đi một,
 * không thì xoá xong gói học vẫn đếm thừa đúng buổi vừa gỡ.
 */
export async function deleteAttendanceAction(id: number): Promise<{ error?: string }> {
  const session = await assertRole(MANAGE_ROLES);
  const row = db
    .prepare("SELECT id, class_id, session_date, status, is_trial, counts_as_used, created_at FROM attendance WHERE id = ?")
    .get(id) as
    | { id: number; class_id: number; session_date: string; status: string; is_trial: number; counts_as_used: number; created_at: string }
    | undefined;
  if (!row) return { error: "Không tìm thấy buổi điểm danh này" };
  const cls = getClass(row.class_id);

  const counted = !row.is_trial && (row.status === "completed" || row.counts_as_used);
  db.transaction(() => {
    if (counted && cls) {
      if (cls.package_id) {
        db.prepare(
          `UPDATE packages SET used_override = MAX(0, used_override - 1)
            WHERE id = ? AND used_override IS NOT NULL AND used_override_set_at >= ?`
        ).run(cls.package_id, row.created_at);
      } else {
        const ids = sessionPoolClassIds(row.class_id);
        db.prepare(
          `UPDATE classes SET used_override = MAX(0, used_override - 1)
            WHERE id IN (${ids.map(() => "?").join(",")}) AND used_override IS NOT NULL AND used_override_set_at >= ?`
        ).run(...ids, row.created_at);
      }
    }
    // Thưởng học thử neo vào dòng điểm danh — dòng trùng thì thưởng cũng trùng.
    db.prepare("DELETE FROM staff_bonuses WHERE ref_type = 'attendance' AND ref_id = ?").run(id);
    db.prepare("DELETE FROM attendance WHERE id = ?").run(id);
  })();

  logAudit(
    session,
    "diem_danh",
    `Xoá điểm danh ngày ${row.session_date} của ${cls?.student_name ?? `lớp #${row.class_id}`}` +
      ` (${ATTENDANCE_STATUS_LABELS[row.status as AttendanceStatus] ?? row.status})`
  );
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/payroll");
  revalidatePath("/admin");
  revalidatePath("/teacher", "layout");
  return {};
}
