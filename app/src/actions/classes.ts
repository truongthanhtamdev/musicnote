"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import type { FormState } from "./teachers";

export async function createClassAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(["admin", "coordinator", "teacher"]);

  const studentName = String(formData.get("student_name") || "").trim();
  const studentPhone = String(formData.get("student_phone") || "").trim();
  const guardianName = String(formData.get("guardian_name") || "").trim();
  const level = String(formData.get("level") || "").trim();
  const subject = String(formData.get("subject") || "").trim() || "Guitar";
  const language = String(formData.get("language") || "vi") === "en" ? "en" : "vi";
  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = String(formData.get("start_time") || "");
  const durationMinutes = Number(formData.get("duration_minutes") || 60);
  const notes = String(formData.get("notes") || "").trim();

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

  if (!studentName || Number.isNaN(dayOfWeek) || !startTime) {
    return { error: "Vui lòng nhập đầy đủ thông tin lớp học" };
  }

  db.prepare(
    `INSERT INTO classes (student_name, student_phone, guardian_name, level, subject, language, source, day_of_week, start_time, duration_minutes, teacher_id, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
  ).run(
    studentName,
    studentPhone || null,
    guardianName || null,
    level || null,
    subject,
    language,
    source,
    dayOfWeek,
    startTime,
    durationMinutes || 60,
    teacherId,
    notes || null
  );

  revalidatePath("/admin/classes");
  revalidatePath("/admin/assign");
  revalidatePath("/teacher/schedule");
  revalidatePath("/teacher");
  return { success: true };
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
  const level = String(formData.get("level") || "").trim();
  const subject = String(formData.get("subject") || "").trim() || "Guitar";
  const language = String(formData.get("language") || "vi") === "en" ? "en" : "vi";
  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = String(formData.get("start_time") || "");
  const durationMinutes = Number(formData.get("duration_minutes") || 60);
  const notes = String(formData.get("notes") || "").trim();

  if (!id || !studentName || Number.isNaN(dayOfWeek) || !startTime) {
    return { error: "Vui lòng nhập đầy đủ thông tin lớp học" };
  }

  const result = db
    .prepare(
      `UPDATE classes SET student_name=?, student_phone=?, guardian_name=?, level=?, subject=?, language=?, day_of_week=?, start_time=?, duration_minutes=?, notes=?
       WHERE id = ? ${session.role === "teacher" ? "AND teacher_id = ?" : ""}`
    )
    .run(
      ...([
        studentName,
        studentPhone || null,
        guardianName || null,
        level || null,
        subject,
        language,
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

export async function assignTeacherAction(classId: number, teacherId: number | null) {
  await assertRole(["admin", "coordinator"]);
  db.prepare("UPDATE classes SET teacher_id = ? WHERE id = ?").run(teacherId, classId);
  revalidatePath("/admin/classes");
  revalidatePath("/admin/assign");
  revalidatePath(`/admin/classes/${classId}`);
}

export async function setClassStatusAction(
  classId: number,
  status: "active" | "paused" | "ended"
) {
  await assertRole(["admin", "coordinator"]);
  db.prepare("UPDATE classes SET status = ? WHERE id = ?").run(status, classId);
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
}

export async function deleteClassAction(classId: number) {
  await assertRole(["admin"]);
  db.prepare("DELETE FROM classes WHERE id = ?").run(classId);
  revalidatePath("/admin/classes");
  revalidatePath("/admin/assign");
}
