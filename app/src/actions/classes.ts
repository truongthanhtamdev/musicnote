"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole, ForbiddenError } from "@/lib/guard";
import { normalizeFacebookUrl, todayISO } from "@/lib/format";
import { notifyUser, getClass } from "@/lib/queries";
import { formatClassSchedule } from "@/lib/types";
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
  db.prepare("UPDATE classes SET trial_pending = 1 WHERE id = ?").run(params.classId);
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
