"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import type { FormState } from "./teachers";

export async function createClassAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertRole(["admin", "coordinator"]);

  const studentName = String(formData.get("student_name") || "").trim();
  const studentPhone = String(formData.get("student_phone") || "").trim();
  const level = String(formData.get("level") || "").trim();
  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = String(formData.get("start_time") || "");
  const durationMinutes = Number(formData.get("duration_minutes") || 45);
  const teacherIdRaw = String(formData.get("teacher_id") || "");
  const teacherId = teacherIdRaw ? Number(teacherIdRaw) : null;
  const notes = String(formData.get("notes") || "").trim();

  if (!studentName || Number.isNaN(dayOfWeek) || !startTime) {
    return { error: "Vui lòng nhập đầy đủ thông tin lớp học" };
  }

  db.prepare(
    `INSERT INTO classes (student_name, student_phone, level, day_of_week, start_time, duration_minutes, teacher_id, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`
  ).run(
    studentName,
    studentPhone || null,
    level || null,
    dayOfWeek,
    startTime,
    durationMinutes || 45,
    teacherId,
    notes || null
  );

  revalidatePath("/admin/classes");
  revalidatePath("/admin/assign");
  return { success: true };
}

export async function updateClassAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertRole(["admin", "coordinator"]);

  const id = Number(formData.get("id"));
  const studentName = String(formData.get("student_name") || "").trim();
  const studentPhone = String(formData.get("student_phone") || "").trim();
  const level = String(formData.get("level") || "").trim();
  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = String(formData.get("start_time") || "");
  const durationMinutes = Number(formData.get("duration_minutes") || 45);
  const notes = String(formData.get("notes") || "").trim();

  if (!id || !studentName || Number.isNaN(dayOfWeek) || !startTime) {
    return { error: "Vui lòng nhập đầy đủ thông tin lớp học" };
  }

  db.prepare(
    `UPDATE classes SET student_name=?, student_phone=?, level=?, day_of_week=?, start_time=?, duration_minutes=?, notes=?
     WHERE id = ?`
  ).run(
    studentName,
    studentPhone || null,
    level || null,
    dayOfWeek,
    startTime,
    durationMinutes || 45,
    notes || null,
    id
  );

  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${id}`);
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
