import { db } from "./db";
import { nextOccurrence, mostRecentOccurrence, toISODate, todayISO } from "./format";
import {
  parseLanguages,
  TRIAL_SESSION_RATE,
  type AttendanceRow,
  type AvailabilityRow,
  type ClassRow,
  type ExpenseRow,
  type PackageRow,
  type PaymentRow,
  type UserRow,
} from "./types";

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

export function listStudents(): UserRow[] {
  return db.prepare("SELECT * FROM users WHERE role = 'student' ORDER BY name").all() as UserRow[];
}

export function getStudentUser(id: number): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(id) as
    | UserRow
    | undefined;
}

export function listClassesForStudent(studentUserId: number): ClassWithTeacher[] {
  return db
    .prepare(
      `SELECT c.*, u.name as teacher_name
       FROM classes c LEFT JOIN users u ON u.id = c.teacher_id
       WHERE c.student_user_id = ?
       ORDER BY c.day_of_week, c.start_time`
    )
    .all(studentUserId) as ClassWithTeacher[];
}

export interface PackageProgress {
  packageId: number;
  total: number;
  used: number;
  remaining: number;
  startedAt: string;
  /** Other classes (weekly slots) drawing from this same package pool, if any. */
  sharedWith: { id: number; day_of_week: number; start_time: string }[];
}

export function getPackage(id: number): PackageRow | undefined {
  return db.prepare("SELECT * FROM packages WHERE id = ?").get(id) as PackageRow | undefined;
}

/**
 * A package is a pool of sessions ("tiết") a student bought, not tied to a
 * single weekly slot — a student who comes 2-3 times a week has several
 * `classes` rows (one per weekly day/time) all pointing at the same
 * `package_id`, and usage is counted across all of them together.
 * Sessions taught ("Đã dạy") since the package's start date count against it.
 */
export function getPackageProgress(cls: ClassRow): PackageProgress | null {
  if (!cls.package_id) return null;
  const pkg = getPackage(cls.package_id);
  if (!pkg) return null;

  const used = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM attendance a
         JOIN classes c ON c.id = a.class_id
         WHERE c.package_id = ? AND a.status = 'completed' AND a.session_date >= ?`
      )
      .get(pkg.id, pkg.started_at) as { c: number }
  ).c;

  const sharedWith = db
    .prepare("SELECT id, day_of_week, start_time FROM classes WHERE package_id = ? AND id != ?")
    .all(pkg.id, cls.id) as { id: number; day_of_week: number; start_time: string }[];

  return {
    packageId: pkg.id,
    total: pkg.total_sessions,
    used,
    remaining: Math.max(0, pkg.total_sessions - used),
    startedAt: pkg.started_at,
    sharedWith,
  };
}

/** Other classes (weekly slots) for the same student — used to offer "share this student's existing package". */
export function listSiblingClasses(cls: ClassRow): ClassWithTeacher[] {
  if (cls.student_user_id) {
    return db
      .prepare(
        `SELECT c.*, u.name as teacher_name FROM classes c
         LEFT JOIN users u ON u.id = c.teacher_id
         WHERE c.student_user_id = ? AND c.id != ?
         ORDER BY c.day_of_week, c.start_time`
      )
      .all(cls.student_user_id, cls.id) as ClassWithTeacher[];
  }
  return db
    .prepare(
      `SELECT c.*, u.name as teacher_name FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       WHERE c.student_name = ? AND c.id != ?
       ORDER BY c.day_of_week, c.start_time`
    )
    .all(cls.student_name, cls.id) as ClassWithTeacher[];
}

export interface ClassWithSchedule extends ClassWithTeacher {
  nextSessionDate: string;
  /** True when the most recent weekly occurrence has already passed (not today) with no attendance recorded. */
  missedLastSession: boolean;
  lastDueDate: string;
}

export function annotateSchedule(classes: ClassWithTeacher[]): ClassWithSchedule[] {
  const today = new Date();
  const todayStr = todayISO();
  return classes.map((c) => {
    const nextSessionDate = toISODate(nextOccurrence(c.day_of_week, today));
    const lastDueDate = toISODate(mostRecentOccurrence(c.day_of_week, today));
    const createdDate = c.created_at.slice(0, 10);
    let missedLastSession = false;
    if (c.status === "active" && lastDueDate < todayStr && lastDueDate >= createdDate) {
      missedLastSession = !getAttendance(c.id, lastDueDate);
    }
    return { ...c, nextSessionDate, missedLastSession, lastDueDate };
  });
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
  trial_sessions: number;
  total_pay: number;
}

/** Trial ("buổi thử") sessions are paid a flat TRIAL_SESSION_RATE regardless of the teacher's normal per-session rate. */
export function computePayroll(from: string, to: string): PayrollRow[] {
  const rows = db
    .prepare(
      `SELECT u.id as teacher_id, u.name as teacher_name, u.pay_per_session as pay_per_session,
              SUM(CASE WHEN a.id IS NOT NULL AND a.is_trial = 0 THEN 1 ELSE 0 END) as completed_sessions,
              SUM(CASE WHEN a.id IS NOT NULL AND a.is_trial = 1 THEN 1 ELSE 0 END) as trial_sessions
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
    total_pay: (r.pay_per_session || 0) * r.completed_sessions + TRIAL_SESSION_RATE * r.trial_sessions,
  }));
}

export function listPayments(
  from: string,
  to: string
): (PaymentRow & { student_name: string | null })[] {
  return db
    .prepare(
      `SELECT p.*, c.student_name as student_name
       FROM payments p
       LEFT JOIN classes c ON c.id = p.class_id
       WHERE p.paid_at >= ? AND p.paid_at <= ?
       ORDER BY p.paid_at DESC, p.id DESC`
    )
    .all(from, to) as (PaymentRow & { student_name: string | null })[];
}

export function listExpenses(from: string, to: string): ExpenseRow[] {
  return db
    .prepare(
      `SELECT * FROM expenses WHERE expense_date >= ? AND expense_date <= ?
       ORDER BY expense_date DESC, id DESC`
    )
    .all(from, to) as ExpenseRow[];
}

export interface RevenueSummary {
  totalRevenue: number;
  totalPayroll: number;
  totalExpenses: number;
  profit: number;
}

export function getRevenueSummary(from: string, to: string): RevenueSummary {
  const totalRevenue = (
    db
      .prepare("SELECT COALESCE(SUM(amount), 0) as s FROM payments WHERE paid_at >= ? AND paid_at <= ?")
      .get(from, to) as { s: number }
  ).s;
  const totalExpenses = (
    db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as s FROM expenses WHERE expense_date >= ? AND expense_date <= ?"
      )
      .get(from, to) as { s: number }
  ).s;
  const totalPayroll = computePayroll(from, to).reduce((sum, r) => sum + r.total_pay, 0);
  return {
    totalRevenue,
    totalPayroll,
    totalExpenses,
    profit: totalRevenue - totalPayroll - totalExpenses,
  };
}
