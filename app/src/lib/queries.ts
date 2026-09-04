import { db } from "./db";
import { nextOccurrence, mostRecentOccurrence, toISODate, todayISO } from "./format";
import {
  parseLanguages,
  LEAD_OPEN_STATUSES,
  TRIAL_SESSION_RATE,
  type AttendanceRow,
  type AvailabilityRow,
  type ClassRow,
  type ExpenseRow,
  type LeadNoteKind,
  type LeadNoteRow,
  type LeadRow,
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

/* ── Khách hàng tiềm năng (lead) ─────────────────────────────────────── */

export interface LeadWithMeta extends LeadRow {
  owner_name: string | null;
  /** Tên học viên trên lớp đã tạo từ lead này (nếu đã chốt). */
  class_student_name: string | null;
  /** Doanh thu thực thu: tổng các khoản thanh toán gắn với lớp của lead này. */
  revenue: number;
  note_count: number;
}

const LEAD_SELECT = `
  SELECT l.*, u.name as owner_name, c.student_name as class_student_name,
         (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.class_id = l.class_id) as revenue,
         (SELECT COUNT(*) FROM lead_notes n WHERE n.lead_id = l.id) as note_count
  FROM leads l
  LEFT JOIN users u ON u.id = l.owner_id
  LEFT JOIN classes c ON c.id = l.class_id`;

export interface LeadFilter {
  status?: string;
  source?: string;
  area?: string;
  subject?: string;
  learningMode?: string;
  ownerId?: number;
  search?: string;
  /** Chỉ lead đang mở và đã tới/quá hạn liên hệ lại. */
  dueOnly?: boolean;
  from?: string;
  to?: string;
  order?: "recent" | "follow_up";
}

export function listLeads(filter: LeadFilter = {}): LeadWithMeta[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (filter.status) {
    if (filter.status === "open") {
      clauses.push(`l.status IN (${LEAD_OPEN_STATUSES.map((s) => `'${s}'`).join(",")})`);
    } else {
      clauses.push("l.status = @status");
      params.status = filter.status;
    }
  }
  if (filter.source) {
    clauses.push("l.source = @source");
    params.source = filter.source;
  }
  if (filter.area) {
    clauses.push("l.area = @area");
    params.area = filter.area;
  }
  if (filter.subject) {
    clauses.push("l.subject = @subject");
    params.subject = filter.subject;
  }
  if (filter.learningMode) {
    clauses.push("l.learning_mode = @learningMode");
    params.learningMode = filter.learningMode;
  }
  if (filter.ownerId) {
    clauses.push("l.owner_id = @ownerId");
    params.ownerId = filter.ownerId;
  }
  if (filter.from) {
    clauses.push("l.received_at >= @from");
    params.from = filter.from;
  }
  if (filter.to) {
    clauses.push("l.received_at <= @to");
    params.to = filter.to;
  }
  if (filter.dueOnly) {
    clauses.push(
      `l.next_follow_up IS NOT NULL AND l.next_follow_up <= @today
       AND l.status IN (${LEAD_OPEN_STATUSES.map((s) => `'${s}'`).join(",")})`
    );
    params.today = todayISO();
  }
  if (filter.search) {
    clauses.push(
      `(l.name LIKE @q OR l.phone LIKE @q OR l.phone_normalized LIKE @q
        OR l.fb_name LIKE @q OR l.area LIKE @q OR l.need LIKE @q OR l.notes LIKE @q)`
    );
    params.q = `%${filter.search}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const order =
    filter.order === "follow_up"
      ? "ORDER BY l.next_follow_up IS NULL, l.next_follow_up, l.id DESC"
      : "ORDER BY l.received_at DESC, l.id DESC";
  return db.prepare(`${LEAD_SELECT} ${where} ${order}`).all(params) as LeadWithMeta[];
}

export function getLead(id: number): LeadWithMeta | undefined {
  return db.prepare(`${LEAD_SELECT} WHERE l.id = ?`).get(id) as LeadWithMeta | undefined;
}

/** Lead khác trùng SĐT (đã chuẩn hoá) — dùng để cảnh báo nhập trùng. */
export function findLeadsByPhone(phoneNormalized: string, excludeId?: number): LeadRow[] {
  if (!phoneNormalized) return [];
  return db
    .prepare(
      `SELECT * FROM leads WHERE phone_normalized = ? AND id != ? ORDER BY received_at DESC`
    )
    .all(phoneNormalized, excludeId ?? 0) as LeadRow[];
}

export function countLeadsDue(): number {
  return (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM leads
         WHERE next_follow_up IS NOT NULL AND next_follow_up <= ?
           AND status IN (${LEAD_OPEN_STATUSES.map((s) => `'${s}'`).join(",")})`
      )
      .get(todayISO()) as { c: number }
  ).c;
}

export function listLeadNotes(leadId: number): (LeadNoteRow & { user_name: string | null })[] {
  return db
    .prepare(
      `SELECT n.*, u.name as user_name FROM lead_notes n
       LEFT JOIN users u ON u.id = n.user_id
       WHERE n.lead_id = ? ORDER BY n.created_at DESC, n.id DESC`
    )
    .all(leadId) as (LeadNoteRow & { user_name: string | null })[];
}

export function addLeadNote(
  leadId: number,
  userId: number | null,
  kind: LeadNoteKind,
  body: string
) {
  db.prepare("INSERT INTO lead_notes (lead_id, user_id, kind, body) VALUES (?, ?, ?, ?)").run(
    leadId,
    userId,
    kind,
    body
  );
}

/** Danh sách giá trị đã dùng của một cột (khu vực, nguồn...) để đổ vào bộ lọc. */
export function listLeadFieldValues(column: "area" | "source" | "subject"): string[] {
  const rows = db
    .prepare(
      `SELECT DISTINCT ${column} as v FROM leads WHERE ${column} IS NOT NULL AND ${column} != '' ORDER BY v`
    )
    .all() as { v: string }[];
  return rows.map((r) => r.v);
}

export interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  won: number;
  lost: number;
  open: number;
  /** Doanh thu thực thu từ những lead nhận trong kỳ (mọi khoản đã đóng của lớp đó). */
  revenue: number;
  /** Doanh thu dự kiến của các lead đang theo (chưa chốt, chưa bỏ). */
  pipelineValue: number;
  /** Chi phí quảng cáo trong kỳ, lấy từ bảng chi phí (mục "Quảng cáo (Ads)"). */
  adsSpend: number;
  /** Chi phí trên mỗi lead. */
  cpl: number | null;
  /** Chi phí để có một khách chốt. */
  cac: number | null;
  /** Doanh thu / chi phí quảng cáo. */
  roas: number | null;
  conversionRate: number | null;
}

/**
 * Thống kê theo "lứa" lead: đếm các lead NHẬN trong khoảng ngày, và doanh thu
 * là toàn bộ tiền những lead đó đã đóng (kể cả đóng ở kỳ sau) — nhờ vậy
 * CAC/ROAS so được đúng với chi phí quảng cáo đã bỏ ra trong kỳ.
 */
export function getLeadStats(from: string, to: string): LeadStats {
  const rows = db
    .prepare("SELECT status, COUNT(*) as c FROM leads WHERE received_at >= ? AND received_at <= ? GROUP BY status")
    .all(from, to) as { status: string; c: number }[];

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    byStatus[r.status] = r.c;
    total += r.c;
  }
  const won = byStatus.won || 0;
  const lost = (byStatus.lost || 0) + (byStatus.cold || 0);
  const open = total - won - lost;

  const revenue = (
    db
      .prepare(
        `SELECT COALESCE(SUM(p.amount), 0) as s FROM payments p
         JOIN leads l ON l.class_id = p.class_id
         WHERE l.received_at >= ? AND l.received_at <= ?`
      )
      .get(from, to) as { s: number }
  ).s;

  const pipelineValue = (
    db
      .prepare(
        `SELECT COALESCE(SUM(expected_value), 0) as s FROM leads
         WHERE received_at >= ? AND received_at <= ?
           AND status IN (${LEAD_OPEN_STATUSES.map((s) => `'${s}'`).join(",")})`
      )
      .get(from, to) as { s: number }
  ).s;

  const adsSpend = getAdsSpend(from, to);

  return {
    total,
    byStatus,
    won,
    lost,
    open,
    revenue,
    pipelineValue,
    adsSpend,
    cpl: total > 0 && adsSpend > 0 ? Math.round(adsSpend / total) : null,
    cac: won > 0 && adsSpend > 0 ? Math.round(adsSpend / won) : null,
    roas: adsSpend > 0 ? revenue / adsSpend : null,
    conversionRate: total > 0 ? won / total : null,
  };
}

/** Chi phí quảng cáo trong kỳ — mọi khoản chi có chữ "Quảng cáo" hoặc "Ads" trong tên loại. */
export function getAdsSpend(from: string, to: string): number {
  return (
    db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as s FROM expenses
         WHERE expense_date >= ? AND expense_date <= ?
           AND (category LIKE '%Quảng cáo%' OR category LIKE '%ads%')`
      )
      .get(from, to) as { s: number }
  ).s;
}

export interface LeadBreakdownRow {
  key: string;
  total: number;
  won: number;
  revenue: number;
  conversionRate: number | null;
}

/** Bảng lead + doanh thu tách theo nguồn / khu vực / hình thức học / môn. */
export function getLeadBreakdown(
  by: "source" | "area" | "learning_mode" | "subject",
  from: string,
  to: string
): LeadBreakdownRow[] {
  const rows = db
    .prepare(
      `SELECT COALESCE(NULLIF(l.${by}, ''), 'Không rõ') as key,
              COUNT(*) as total,
              SUM(CASE WHEN l.status = 'won' THEN 1 ELSE 0 END) as won,
              COALESCE(SUM(
                (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.class_id = l.class_id)
              ), 0) as revenue
       FROM leads l
       WHERE l.received_at >= ? AND l.received_at <= ?
       GROUP BY key
       ORDER BY total DESC`
    )
    .all(from, to) as Omit<LeadBreakdownRow, "conversionRate">[];

  return rows.map((r) => ({ ...r, conversionRate: r.total > 0 ? r.won / r.total : null }));
}

/** Lý do từ chối hay gặp nhất — để biết nên chỉnh giá, chỉnh target quảng cáo hay chỉnh lịch. */
export function getLostReasons(from: string, to: string): { reason: string; count: number }[] {
  return db
    .prepare(
      `SELECT COALESCE(NULLIF(lost_reason, ''), 'Không ghi lý do') as reason, COUNT(*) as count
       FROM leads
       WHERE status IN ('lost','cold') AND received_at >= ? AND received_at <= ?
       GROUP BY reason ORDER BY count DESC`
    )
    .all(from, to) as { reason: string; count: number }[];
}

/** Các khoản đã thu của lớp gắn với lead — hiện ngay trong trang chi tiết lead. */
export function listPaymentsForClass(classId: number): PaymentRow[] {
  return db
    .prepare("SELECT * FROM payments WHERE class_id = ? ORDER BY paid_at DESC, id DESC")
    .all(classId) as PaymentRow[];
}
