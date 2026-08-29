import { db } from "./db";
import { parseLanguages, type AttendanceRow, type AvailabilityRow, type ClassRow, type UserRow } from "./types";

export function listTeachers(includeInactive = true): UserRow[] {
  const sql = includeInactive
    ? "SELECT * FROM users WHERE role = 'teacher' ORDER BY name"
    : "SELECT * FROM users WHERE role = 'teacher' AND active = 1 ORDER BY name";
  return db.prepare(sql).all() as UserRow[];
}

export function listStaff(): UserRow[] {
  return db
    .prepare("SELECT * FROM users WHERE role IN ('admin','coordinator') ORDER BY role, name")
    .all() as UserRow[];
}

export function getTeacher(id: number): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ? AND role = 'teacher'").get(id) as
    | UserRow
    | undefined;
}

export interface ClassWithTeacher extends ClassRow {
  teacher_name: string | null;
}

export function listClasses(filter?: {
  teacherId?: number | null;
  status?: string;
  unassignedOnly?: boolean;
}): ClassWithTeacher[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (filter?.teacherId !== undefined) {
    if (filter.teacherId === null) {
      clauses.push("c.teacher_id IS NULL");
    } else {
      clauses.push("c.teacher_id = @teacherId");
      params.teacherId = filter.teacherId;
    }
  }
  if (filter?.unassignedOnly) {
    clauses.push("c.teacher_id IS NULL");
  }
  if (filter?.status) {
    clauses.push("c.status = @status");
    params.status = filter.status;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT c.*, u.name as teacher_name
       FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       ${where}
       ORDER BY c.day_of_week, c.start_time`
    )
    .all(params) as ClassWithTeacher[];
  return rows;
}

export function getClass(id: number): ClassWithTeacher | undefined {
  return db
    .prepare(
      `SELECT c.*, u.name as teacher_name FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id WHERE c.id = ?`
    )
    .get(id) as ClassWithTeacher | undefined;
}

export function listClassesForTeacher(teacherId: number): ClassWithTeacher[] {
  return listClasses({ teacherId });
}

export function listClassesByDay(dayOfWeek: number): ClassWithTeacher[] {
  return db
    .prepare(
      `SELECT c.*, u.name as teacher_name
       FROM classes c LEFT JOIN users u ON u.id = c.teacher_id
       WHERE c.day_of_week = ? AND c.status = 'active'
       ORDER BY c.start_time`
    )
    .all(dayOfWeek) as ClassWithTeacher[];
}

export function teacherSpeaksLanguage(teacher: UserRow, language: string): boolean {
  return parseLanguages(teacher.languages).includes(language as "vi" | "en");
}

export function listAvailability(teacherId: number): AvailabilityRow[] {
  return db
    .prepare(
      "SELECT * FROM availability WHERE teacher_id = ? ORDER BY day_of_week, start_time"
    )
    .all(teacherId) as AvailabilityRow[];
}

export function isTeacherAvailable(
  teacherId: number,
  dayOfWeek: number,
  startTime: string,
  durationMinutes: number
): boolean {
  const slots = listAvailability(teacherId).filter((s) => s.day_of_week === dayOfWeek);
  if (slots.length === 0) return false;
  const [sh, sm] = startTime.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = startMin + durationMinutes;
  return slots.some((s) => {
    const [ah, am] = s.start_time.split(":").map(Number);
    const [bh, bm] = s.end_time.split(":").map(Number);
    const aMin = ah * 60 + am;
    const bMin = bh * 60 + bm;
    return startMin >= aMin && endMin <= bMin;
  });
}

export function getAttendance(classId: number, sessionDate: string): AttendanceRow | undefined {
  return db
    .prepare("SELECT * FROM attendance WHERE class_id = ? AND session_date = ?")
    .get(classId, sessionDate) as AttendanceRow | undefined;
}

export function listAttendance(filter?: {
  teacherId?: number;
  from?: string;
  to?: string;
  classId?: number;
}): (AttendanceRow & { student_name: string; teacher_name: string })[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (filter?.teacherId) {
    clauses.push("a.teacher_id = @teacherId");
    params.teacherId = filter.teacherId;
  }
  if (filter?.classId) {
    clauses.push("a.class_id = @classId");
    params.classId = filter.classId;
  }
  if (filter?.from) {
    clauses.push("a.session_date >= @from");
    params.from = filter.from;
  }
  if (filter?.to) {
    clauses.push("a.session_date <= @to");
    params.to = filter.to;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(
      `SELECT a.*, c.student_name as student_name, u.name as teacher_name
       FROM attendance a
       JOIN classes c ON c.id = a.class_id
       JOIN users u ON u.id = a.teacher_id
       ${where}
       ORDER BY a.session_date DESC, a.check_in_time DESC`
    )
    .all(params) as (AttendanceRow & { student_name: string; teacher_name: string })[];
}

export interface PayrollRow {
  teacher_id: number;
  teacher_name: string;
  pay_per_session: number | null;
  completed_sessions: number;
  total_pay: number;
}

export function computePayroll(from: string, to: string): PayrollRow[] {
  const rows = db
    .prepare(
      `SELECT u.id as teacher_id, u.name as teacher_name, u.pay_per_session as pay_per_session,
              COUNT(a.id) as completed_sessions
       FROM users u
       LEFT JOIN attendance a ON a.teacher_id = u.id
         AND a.status = 'completed' AND a.session_date >= ? AND a.session_date <= ?
       WHERE u.role = 'teacher'
       GROUP BY u.id
       ORDER BY u.name`
    )
    .all(from, to) as Omit<PayrollRow, "total_pay">[];

  return rows.map((r) => ({
    ...r,
    total_pay: (r.pay_per_session || 0) * r.completed_sessions,
  }));
}
