"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { getAttendance, getClass, getPackageProgress } from "@/lib/queries";
import { hasRescheduleInfo, type AttendanceStatus } from "@/lib/types";
import type { FormState } from "./teachers";

const VALID_STATUS: AttendanceStatus[] = [
  "completed",
  "teacher_absent",
  "student_absent",
  "rescheduled",
];

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
  const sessionNumberRaw = String(formData.get("session_number") ?? "").trim();
  const sessionNumber = sessionNumberRaw === "" ? null : Number(sessionNumberRaw);
  const statedSessionNumber =
    sessionNumber !== null && Number.isInteger(sessionNumber) && sessionNumber >= 0
      ? sessionNumber
      : null;

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
  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (existing) {
    // is_trial isn't in this SET list on purpose — it follows "buổi thứ mấy"
    // (updated separately below when the teacher states one), so a
    // correction that leaves that box alone keeps whatever was saved.
    db.prepare(
      `UPDATE attendance SET status=?, fb_checkin_confirmed=?, lesson_content=?, note=?, rescheduled_to_date=?, rescheduled_to_time=?, check_out_time=? WHERE id=?`
    ).run(
      status,
      fbConfirmed,
      lessonContent || null,
      note || null,
      rescheduledToDate || null,
      rescheduledToTime || null,
      nowStr,
      existing.id
    );
    if (statedSessionNumber !== null) {
      db.prepare("UPDATE attendance SET is_trial = ? WHERE id = ?").run(
        statedSessionNumber === 0 ? 1 : 0,
        existing.id
      );
    }
  } else {
    // Trial status isn't a manual checkbox. The teacher writing "buổi 0"
    // says so outright; otherwise it auto-fires for a class's very first
    // recorded session, but only when trial_pending was set by the center
    // actually assigning the class to a teacher (never for a teacher's own
    // self-added/backfilled classes). Either way the flag is consumed here,
    // so only one session per assignment can count as the trial.
    const isTrial =
      statedSessionNumber !== null ? (statedSessionNumber === 0 ? 1 : 0) : owned.trial_pending ? 1 : 0;
    if (owned.trial_pending) {
      db.prepare("UPDATE classes SET trial_pending = 0 WHERE id = ?").run(classId);
    }
    db.prepare(
      `INSERT INTO attendance (class_id, teacher_id, session_date, status, check_in_time, check_out_time, fb_checkin_confirmed, lesson_content, is_trial, note, rescheduled_to_date, rescheduled_to_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      rescheduledToTime || null
    );
  }

  // A stated "buổi thứ mấy" that doesn't match what the system just counted
  // becomes the package's new baseline — the count picks up from there and
  // keeps counting itself afterwards (this session is already recorded, and
  // its created_at isn't after the baseline, so it isn't counted twice).
  // Matching numbers change nothing, which keeps the common case on the
  // plain automatic count rather than pinning a baseline on every check-in.
  if (statedSessionNumber !== null && owned.package_id) {
    const cls = getClass(classId);
    const countedNow = cls ? (getPackageProgress(cls)?.used ?? null) : null;
    if (countedNow !== statedSessionNumber) {
      db.prepare(
        "UPDATE packages SET used_override = ?, used_override_set_at = datetime('now') WHERE id = ?"
      ).run(statedSessionNumber, owned.package_id);
    }
  }

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
  await assertRole(["admin", "coordinator"]);

  const id = Number(formData.get("id"));
  const status = String(formData.get("status") || "") as AttendanceStatus;
  const lessonContent = String(formData.get("lesson_content") || "").trim();
  const isTrial = formData.get("is_trial") ? 1 : 0;
  const note = String(formData.get("note") || "").trim();
  const rescheduledToDate =
    hasRescheduleInfo(status) ? String(formData.get("rescheduled_to_date") || "").trim() : "";
  const rescheduledToTime =
    hasRescheduleInfo(status) ? String(formData.get("rescheduled_to_time") || "").trim() : "";

  if (!id || !VALID_STATUS.includes(status)) {
    return { error: "Dữ liệu không hợp lệ" };
  }

  db.prepare(
    `UPDATE attendance SET status = ?, lesson_content = ?, is_trial = ?, note = ?, rescheduled_to_date = ?, rescheduled_to_time = ? WHERE id = ?`
  ).run(
    status,
    lessonContent || null,
    isTrial,
    note || null,
    rescheduledToDate || null,
    rescheduledToTime || null,
    id
  );

  revalidatePath("/admin/attendance");
  return { success: true };
}
