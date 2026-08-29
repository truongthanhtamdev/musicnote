"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { getAttendance } from "@/lib/queries";
import type { AttendanceStatus } from "@/lib/types";
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
  const note = String(formData.get("note") || "").trim();

  if (!classId || !sessionDate || !VALID_STATUS.includes(status)) {
    return { error: "Dữ liệu điểm danh không hợp lệ" };
  }

  const owned = db
    .prepare("SELECT id FROM classes WHERE id = ? AND teacher_id = ?")
    .get(classId, session.userId);
  if (!owned) {
    return { error: "Bạn không phụ trách lớp này" };
  }

  const existing = getAttendance(classId, sessionDate);
  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (existing) {
    db.prepare(
      `UPDATE attendance SET status=?, fb_checkin_confirmed=?, note=?, check_out_time=? WHERE id=?`
    ).run(status, fbConfirmed, note || null, nowStr, existing.id);
  } else {
    db.prepare(
      `INSERT INTO attendance (class_id, teacher_id, session_date, status, check_in_time, check_out_time, fb_checkin_confirmed, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(classId, session.userId, sessionDate, status, nowStr, nowStr, fbConfirmed, note || null);
  }

  revalidatePath("/teacher");
  revalidatePath("/teacher/attendance");
  revalidatePath("/admin/attendance");
  return { success: true };
}

export async function correctAttendanceAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertRole(["admin", "coordinator"]);

  const id = Number(formData.get("id"));
  const status = String(formData.get("status") || "") as AttendanceStatus;
  const note = String(formData.get("note") || "").trim();

  if (!id || !VALID_STATUS.includes(status)) {
    return { error: "Dữ liệu không hợp lệ" };
  }

  db.prepare("UPDATE attendance SET status = ?, note = ? WHERE id = ?").run(
    status,
    note || null,
    id
  );

  revalidatePath("/admin/attendance");
  return { success: true };
}
