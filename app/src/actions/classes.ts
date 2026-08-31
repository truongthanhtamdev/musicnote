"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole, ForbiddenError } from "@/lib/guard";
import { todayISO } from "@/lib/format";
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
  const scheduleType = String(formData.get("schedule_type") || "fixed") === "flexible" ? "flexible" : "fixed";
  const dayOfWeek = scheduleType === "flexible" ? -1 : Number(formData.get("day_of_week"));
  const startTime = scheduleType === "flexible" ? "" : String(formData.get("start_time") || "");
  const durationMinutes = Number(formData.get("duration_minutes") || 60);
  const notes = String(formData.get("notes") || "").trim();
  const packageRaw = String(formData.get("package_total_sessions") || "");
  const packageTotalSessions = packageRaw ? Number(packageRaw) : null;

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

  if (!studentName || (scheduleType === "fixed" && (Number.isNaN(dayOfWeek) || !startTime))) {
    return { error: "Vui lòng nhập đầy đủ thông tin lớp học" };
  }

  let packageId: number | null = null;
  if (packageTotalSessions) {
    const info = db
      .prepare("INSERT INTO packages (total_sessions, started_at) VALUES (?, ?)")
      .run(packageTotalSessions, todayISO());
    packageId = Number(info.lastInsertRowid);
  }

  db.prepare(
    `INSERT INTO classes (student_name, student_phone, guardian_name, level, subject, language, source, package_id, schedule_type, day_of_week, start_time, duration_minutes, teacher_id, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
  ).run(
    studentName,
    studentPhone || null,
    guardianName || null,
    level || null,
    subject,
    language,
    source,
    packageId,
    scheduleType,
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
      `UPDATE classes SET student_name=?, student_phone=?, guardian_name=?, level=?, subject=?, language=?, schedule_type=?, day_of_week=?, start_time=?, duration_minutes=?, notes=?
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

/** Detach from any shared pool and start a fresh own package for this class, or clear it entirely (totalSessions = null). */
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
