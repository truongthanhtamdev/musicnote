import { db } from "./db";
import { addMinutesToTime, nextOccurrence, mostRecentOccurrence, toISODate, todayISO, now } from "./format";
import {
  parseLanguages,
  parseSubjects,
  TRIAL_SESSION_RATE,
  type AttendanceRow,
  type BusySlotRow,
  type ClassRow,
  type ExpenseRow,
  type NotificationRow,
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

// Teachers created before the subjects field existed have it empty, which
// we treat as "not specified" rather than "teaches nothing" — otherwise
// every pre-existing teacher would suddenly look unfit for every class.
export function teacherTeachesSubject(teacher: UserRow, subject: string): boolean {
  const subjects = parseSubjects(teacher.subjects);
  return subjects.length === 0 || subjects.includes(subject);
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
  /** True when `used` came from a manual correction rather than counting attendance. */
  isManuallyAdjusted: boolean;
  /**
   * Other classes drawing from this same package pool, if any — either the
   * same student's other weekly slots, or a sibling the customer enrolled on
   * the one package.
   */
  sharedWith: { id: number; day_of_week: number; start_time: string; student_name: string }[];
}

export function getPackage(id: number): PackageRow | undefined {
  return db.prepare("SELECT * FROM packages WHERE id = ?").get(id) as PackageRow | undefined;
}

/**
 * Sessions used/remaining for a batch of packages in one query each (not one
 * per package) — `used` is a correlated subquery SQLite evaluates per row
 * server-side, still a single round-trip from the app's side. `sharedWith`
 * is left empty here; only `getPackageProgress` (below) fills it in, since
 * it's the only caller that renders it.
 */
function getPackageProgressBatch(packageIds: number[]): Map<number, PackageProgress> {
  const map = new Map<number, PackageProgress>();
  if (packageIds.length === 0) return map;
  const placeholders = packageIds.map(() => "?").join(",");
  // computedUsed counts completed attendance since the package started —
  // excluding trials, since "buổi 0" is a taster that doesn't eat a paid
  // session, which is also how sessionNumberMap numbers them. It counts
  // only from after used_override_set_at when a baseline is set, so a
  // manually-entered baseline (e.g. backfilling an old class already at
  // session 15) keeps counting up from there instead of freezing. The cutoff
  // compares against a.created_at (insertion order), not a.session_date —
  // deliberately: it needs to count a same-day check-in made right after the
  // baseline was typed, which session_date alone can't distinguish from one
  // made earlier the same day. The tradeoff is a rare edge case the other
  // way: backfilling a session dated *before* the baseline was set, via
  // "Điểm danh buổi học bù", after that baseline already exists, still adds
  // to the count even though it may already be reflected in the baseline.
  const rows = db
    .prepare(
      `SELECT p.id as packageId, p.total_sessions as total, p.started_at as startedAt, p.used_override as usedOverride,
        (SELECT COUNT(*) FROM attendance a JOIN classes c ON c.id = a.class_id
         WHERE c.package_id = p.id AND a.status = 'completed' AND a.is_trial = 0
           AND a.session_date >= p.started_at
           AND (p.used_override_set_at IS NULL OR a.created_at > p.used_override_set_at)) as computedUsed
       FROM packages p WHERE p.id IN (${placeholders})`
    )
    .all(...packageIds) as {
    packageId: number;
    total: number;
    startedAt: string;
    usedOverride: number | null;
    computedUsed: number;
  }[];
  for (const r of rows) {
    const used = r.usedOverride != null ? r.usedOverride + r.computedUsed : r.computedUsed;
    map.set(r.packageId, {
      packageId: r.packageId,
      total: r.total,
      used,
      remaining: Math.max(0, r.total - used),
      startedAt: r.startedAt,
      isManuallyAdjusted: r.usedOverride != null,
      sharedWith: [],
    });
  }
  return map;
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
  const base = getPackageProgressBatch([cls.package_id]).get(cls.package_id);
  if (!base) return null;

  const sharedWith = db
    .prepare(
      "SELECT id, day_of_week, start_time, student_name FROM classes WHERE package_id = ? AND id != ?"
    )
    .all(cls.package_id, cls.id) as PackageProgress["sharedWith"];

  return { ...base, sharedWith };
}

/** Progress for every class in one batch (e.g. a teacher's whole schedule), without the per-package `sharedWith` query. */
export function getPackageProgressForClasses(classes: ClassRow[]): Map<number, PackageProgress> {
  const packageIds = [...new Set(classes.map((c) => c.package_id).filter((id): id is number => id != null))];
  return getPackageProgressBatch(packageIds);
}

/** Active students whose package is running low (remaining <= threshold), for the admin dashboard. */
export function listPackagesNearingCompletion(threshold = 3): (ClassWithTeacher & PackageProgress)[] {
  const classes = db
    .prepare(
      `SELECT c.*, u.name as teacher_name
       FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       WHERE c.package_id IS NOT NULL AND c.status = 'active'
         AND c.id = (SELECT MIN(id) FROM classes WHERE package_id = c.package_id AND status = 'active')`
    )
    .all() as ClassWithTeacher[];
  const progressByPackage = getPackageProgressBatch(
    classes.map((c) => c.package_id).filter((id): id is number => id != null)
  );

  return classes
    .map((cls) => {
      const progress = cls.package_id ? progressByPackage.get(cls.package_id) : undefined;
      return progress ? { ...cls, ...progress } : null;
    })
    .filter((row): row is ClassWithTeacher & PackageProgress => !!row && row.remaining <= threshold)
    .sort((a, b) => a.remaining - b.remaining);
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
  const today = now();
  const todayStr = todayISO();
  return classes.map((c) => {
    // Flexible classes have no fixed weekly day, so "next session" and
    // "missed last session" (both computed from weekly recurrence) don't
    // apply — every session is scheduled and checked in ad-hoc instead.
    if (c.schedule_type === "flexible") {
      return { ...c, nextSessionDate: "", missedLastSession: false, lastDueDate: "" };
    }
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

/**
 * "Buổi thứ mấy" cho từng lần điểm danh: đếm luỹ tiến các buổi đã dạy trong
 * cùng gói học (buổi học thử không tính, và không được đánh số). Lớp không
 * theo gói thì đếm riêng trong lớp đó. Luôn đếm từ đầu lịch sử, không phụ
 * thuộc khoảng ngày đang lọc, nên số buổi hiển thị ở mọi trang đều khớp nhau.
 *
 * Khi ai đó sửa tay số buổi (mốc `used_override` của gói), việc đánh số bám
 * theo mốc đó thay vì đếm lại từ 1: buổi cuối cùng trước lúc đặt mốc chính là
 * số vừa nhập, các buổi trước nó lùi dần, các buổi sau tăng tiếp — nhờ vậy
 * badge "Buổi N" ở bảng điểm danh luôn khớp với "đã học N/20" của gói học.
 */
export function sessionNumberMap(classIds: number[]): Map<number, number> {
  const out = new Map<number, number>();
  if (classIds.length === 0) return out;

  const placeholders = classIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT a.id, a.is_trial, a.status, a.created_at, COALESCE(c.package_id, -c.id) AS pool,
              p.used_override AS baseline, p.used_override_set_at AS baselineAt
       FROM attendance a
       JOIN classes c ON c.id = a.class_id
       LEFT JOIN packages p ON p.id = c.package_id
       WHERE COALESCE(c.package_id, -c.id) IN (
         SELECT COALESCE(package_id, -id) FROM classes WHERE id IN (${placeholders})
       )
       ORDER BY a.session_date ASC, a.id ASC`
    )
    .all(...classIds) as {
    id: number;
    is_trial: number;
    status: string;
    created_at: string;
    pool: number;
    baseline: number | null;
    baselineAt: string | null;
  }[];

  const byPool = new Map<number, typeof rows>();
  for (const r of rows) {
    if (r.status !== "completed" || r.is_trial) continue;
    const list = byPool.get(r.pool) ?? [];
    list.push(r);
    byPool.set(r.pool, list);
  }

  for (const counted of byPool.values()) {
    const { baseline, baselineAt } = counted[0];
    if (baseline == null || baselineAt == null) {
      counted.forEach((r, i) => out.set(r.id, i + 1));
      continue;
    }
    const before = counted.filter((r) => r.created_at <= baselineAt);
    const after = counted.filter((r) => r.created_at > baselineAt);
    // The last session recorded before the correction is the number typed in;
    // earlier ones step back from it (skipping any that would land at 0 or
    // below, i.e. sessions the typed number doesn't account for).
    before.forEach((r, i) => {
      const n = baseline - (before.length - 1 - i);
      if (n > 0) out.set(r.id, n);
    });
    after.forEach((r, i) => out.set(r.id, baseline + i + 1));
  }
  return out;
}

/** Half-hour blocks the teacher has marked BUSY — everything not listed here defaults to free. */
export function listBusySlots(teacherId: number): BusySlotRow[] {
  return db
    .prepare(
      "SELECT * FROM availability WHERE teacher_id = ? ORDER BY day_of_week, start_time"
    )
    .all(teacherId) as BusySlotRow[];
}

function timeRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return toMin(aStart) < toMin(bEnd) && toMin(aEnd) > toMin(bStart);
}

/**
 * Free unless the requested time range overlaps a slot the teacher marked
 * busy, or a class they already teach. `excludeClassId` leaves out one
 * class from the "already teaching" check — pass the class being edited so
 * its own currently-assigned teacher doesn't show as unavailable for it.
 */
export function isTeacherAvailable(
  teacherId: number,
  dayOfWeek: number,
  startTime: string,
  durationMinutes: number,
  excludeClassId?: number
): boolean {
  const endTime = addMinutesToTime(startTime, durationMinutes);

  const busySlots = listBusySlots(teacherId).filter((s) => s.day_of_week === dayOfWeek);
  if (busySlots.some((s) => timeRangesOverlap(startTime, endTime, s.start_time, s.end_time))) {
    return false;
  }

  const existingClasses = db
    .prepare(
      `SELECT start_time, duration_minutes FROM classes
       WHERE teacher_id = ? AND day_of_week = ? AND schedule_type = 'fixed' AND status = 'active'
         AND id != ?`
    )
    .all(teacherId, dayOfWeek, excludeClassId ?? -1) as {
    start_time: string;
    duration_minutes: number;
  }[];
  return !existingClasses.some((c) =>
    timeRangesOverlap(startTime, endTime, c.start_time, addMinutesToTime(c.start_time, c.duration_minutes))
  );
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

export function listUnreadNotifications(userId: number): NotificationRow[] {
  return db
    .prepare(
      "SELECT * FROM notifications WHERE user_id = ? AND read_at IS NULL ORDER BY created_at DESC"
    )
    .all(userId) as NotificationRow[];
}

export function notifyUser(userId: number, message: string, classId: number | null = null) {
  db.prepare("INSERT INTO notifications (user_id, message, class_id) VALUES (?, ?, ?)").run(
    userId,
    message,
    classId
  );
}
