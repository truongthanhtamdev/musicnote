import { db } from "./db";
import {
  addDays,
  endMinutesOfDay,
  nextOccurrence,
  mostRecentOccurrence,
  toISODate,
  toMinutesOfDay,
  todayISO,
  now,
} from "./format";
import {
  getSuggestedPackagePrice,
  parseLanguages,
  parseSubjects,
  LATE_CHECKIN_FREE_QUOTA,
  MISSED_CHECKIN_DAYS,
  NEW_CLASS_DAYS,
  REMINDER_DAYS,
  TIME_SLOTS,
  TRIAL_SESSION_RATE,
  type AttendanceRow,
  type AttendanceStatus,
  type BusySlotRow,
  type ClassRow,
  type ExpenseRow,
  type NotificationRow,
  type PackageRow,
  type PaymentRow,
  type CenterContact,
  type RescheduleRequestRow,
  type RescheduleStatus,
  type TrialRequestRow,
  type TrialRequestStatus,
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
export function getPackageProgressBatch(packageIds: number[]): Map<number, PackageProgress> {
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
         WHERE c.package_id = p.id AND (a.status = 'completed' OR a.counts_as_used = 1) AND a.is_trial = 0
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
 * Sessions taught ("Đã dạy") since the package's start date count against it,
 * cùng với buổi học viên vắng không báo trước (counts_as_used).
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

export interface TuitionStatus {
  /** Tổng học phí đã thu cho lớp này (gộp cả các lịch học dùng chung gói). */
  paid: number;
  /** Học phí đáng lẽ phải thu theo giá gói — null khi lớp không theo gói hoặc gói không có giá niêm yết. */
  expected: number | null;
  /** Còn thiếu bao nhiêu; 0 khi đã đủ hoặc không xác định được. */
  outstanding: number;
  /** Lớp đang học mà chưa thu đủ học phí — cần gọi khách hàng. */
  needsFollowUp: boolean;
}

/**
 * Tình trạng học phí của từng lớp. Nhiều lịch học dùng chung một gói thì
 * khách hàng chỉ đóng một lần, khoản thu gắn vào một lớp bất kỳ trong nhóm —
 * nên tiền được cộng theo GÓI rồi mới chia về từng lớp, không thì các lịch
 * còn lại đều bị hiểu nhầm là chưa đóng.
 *
 * Lớp không theo gói không có giá để đối chiếu, nên chỉ nhắc khi hoàn toàn
 * chưa thu đồng nào và lớp còn mới (hoặc đang chờ buổi học thử) — tránh réo
 * hàng loạt lớp cũ vốn thu tiền ngoài hệ thống.
 */
export function getTuitionStatusForClasses(
  classes: ClassWithTeacher[]
): Map<number, TuitionStatus> {
  const result = new Map<number, TuitionStatus>();
  if (classes.length === 0) return result;

  const paidByClassId = new Map<number, number>();
  for (const row of db
    .prepare(
      "SELECT class_id, SUM(amount) as total FROM payments WHERE class_id IS NOT NULL GROUP BY class_id"
    )
    .all() as { class_id: number; total: number }[]) {
    paidByClassId.set(row.class_id, row.total);
  }

  // Gộp tiền theo gói: mọi lớp dùng chung một package_id chia nhau cùng một
  // số tiền đã thu.
  const paidByPackageId = new Map<number, number>();
  const totalsByPackageId = new Map<number, number>();
  for (const row of db
    .prepare("SELECT id, package_id FROM classes WHERE package_id IS NOT NULL")
    .all() as { id: number; package_id: number }[]) {
    paidByPackageId.set(
      row.package_id,
      (paidByPackageId.get(row.package_id) ?? 0) + (paidByClassId.get(row.id) ?? 0)
    );
  }
  for (const row of db
    .prepare("SELECT id, total_sessions FROM packages")
    .all() as { id: number; total_sessions: number }[]) {
    totalsByPackageId.set(row.id, row.total_sessions);
  }

  const newestAcceptableCreatedAt = new Date(now());
  newestAcceptableCreatedAt.setDate(newestAcceptableCreatedAt.getDate() - NEW_CLASS_DAYS);
  const newClassCutoff = toISODate(newestAcceptableCreatedAt);

  for (const cls of classes) {
    const paid = cls.package_id
      ? (paidByPackageId.get(cls.package_id) ?? 0)
      : (paidByClassId.get(cls.id) ?? 0);
    const packageTotal = cls.package_id ? totalsByPackageId.get(cls.package_id) : undefined;
    const expected = packageTotal ? getSuggestedPackagePrice(cls.subject, packageTotal) : null;
    const outstanding = expected ? Math.max(0, expected - paid) : 0;

    let needsFollowUp = false;
    if (cls.status === "active") {
      if (cls.package_id) {
        needsFollowUp = expected ? paid < expected : paid === 0;
      } else {
        needsFollowUp =
          paid === 0 && (cls.trial_pending === 1 || cls.created_at.slice(0, 10) >= newClassCutoff);
      }
    }

    result.set(cls.id, { paid, expected, outstanding, needsFollowUp });
  }
  return result;
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
      `SELECT a.id, a.is_trial, a.status, a.counts_as_used, a.created_at, COALESCE(c.package_id, -c.id) AS pool,
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
    counts_as_used: number;
    created_at: string;
    pool: number;
    baseline: number | null;
    baselineAt: string | null;
  }[];

  const byPool = new Map<number, typeof rows>();
  for (const r of rows) {
    // Đánh số đúng theo cách gói học đếm: buổi đã dạy, cộng buổi khách vắng
    // không báo trước (cũng trừ tiết), trừ buổi học thử.
    if ((r.status !== "completed" && !r.counts_as_used) || r.is_trial) continue;
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

/**
 * Hai khoảng thời gian (tính bằng phút từ 00:00) có đè lên nhau không.
 * Nhận số chứ không nhận "HH:MM": lớp tối muộn kết thúc lúc 24:00 hoặc qua
 * nửa đêm, chuỗi giờ đã vòng về "00:00" thì so sánh ra sai.
 */
function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Mọi thứ giáo viên đã chiếm chỗ trong tuần: khung tự đánh dấu bận + lớp đang
 * dạy. Đọc một lần rồi kiểm tra trong bộ nhớ, để quét cả lưới ngày×giờ (hàng
 * trăm ô, như lúc gợi ý giờ dời lớp) không thành hàng trăm truy vấn.
 */
function loadTeacherBusyRanges(
  teacherId: number,
  excludeClassId?: number
): Map<number, { start: number; end: number }[]> {
  const byDay = new Map<number, { start: number; end: number }[]>();
  const push = (day: number, startTime: string, durationMinutes: number) => {
    const range = {
      start: toMinutesOfDay(startTime),
      end: endMinutesOfDay(startTime, durationMinutes),
    };
    const list = byDay.get(day);
    if (list) list.push(range);
    else byDay.set(day, [range]);
  };

  // Ô bận luôn là một khối 30 phút (toggleBusySlotAction ghi vậy), nên tính lại
  // giờ kết thúc từ giờ bắt đầu thay vì đọc end_time đã lưu — ô 23:30 lưu
  // end_time là "00:00", đọc thẳng sẽ thành khoảng âm.
  for (const slot of listBusySlots(teacherId)) {
    push(slot.day_of_week, slot.start_time, 30);
  }

  const existingClasses = db
    .prepare(
      `SELECT day_of_week, start_time, duration_minutes FROM classes
       WHERE teacher_id = ? AND schedule_type = 'fixed' AND status = 'active' AND id != ?`
    )
    .all(teacherId, excludeClassId ?? -1) as {
    day_of_week: number;
    start_time: string;
    duration_minutes: number;
  }[];
  for (const c of existingClasses) {
    push(c.day_of_week, c.start_time, c.duration_minutes);
  }
  return byDay;
}

function isRangeFree(
  busyByDay: Map<number, { start: number; end: number }[]>,
  dayOfWeek: number,
  startTime: string,
  durationMinutes: number
): boolean {
  const start = toMinutesOfDay(startTime);
  const end = endMinutesOfDay(startTime, durationMinutes);
  const busy = busyByDay.get(dayOfWeek);
  return !busy?.some((b) => rangesOverlap(start, end, b.start, b.end));
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
  const busyByDay = loadTeacherBusyRanges(teacherId, excludeClassId);
  return isRangeFree(busyByDay, dayOfWeek, startTime, durationMinutes);
}

export interface FreeSlotOption {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
  dayOfWeek: number;
}

/**
 * Những khung giờ trong `days` ngày tới mà giáo viên còn trống, để học viên
 * chọn khi xin dời buổi — khách chỉ thấy giờ giáo viên dạy được, khỏi hẹn tới
 * hẹn lui. Bỏ qua giờ đã qua trong hôm nay và giờ quá sát (dưới `minLeadHours`
 * tiếng nữa), vì giáo viên cũng cần thời gian sắp xếp.
 */
export function listTeacherFreeSlots(opts: {
  teacherId: number;
  durationMinutes: number;
  days: number;
  excludeClassId?: number;
  minLeadHours?: number;
}): FreeSlotOption[] {
  const { teacherId, durationMinutes, days, excludeClassId, minLeadHours = 2 } = opts;
  const busyByDay = loadTeacherBusyRanges(teacherId, excludeClassId);
  const from = now();
  const earliest = new Date(from.getTime() + minLeadHours * 60 * 60 * 1000);
  const out: FreeSlotOption[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const dayOfWeek = date.getDay();
    const iso = toISODate(date);
    for (const time of TIME_SLOTS) {
      const [h, m] = time.split(":").map(Number);
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
      if (at < earliest) continue;
      if (isRangeFree(busyByDay, dayOfWeek, time, durationMinutes)) {
        out.push({ date: iso, time, dayOfWeek });
      }
    }
  }
  return out;
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
  /** Số buổi đã dạy nhưng điểm danh bù (ghi sau ngày học). */
  late_sessions: number;
  /** Trong số đó, bao nhiêu buổi vượt hạn mức được tha nên không tính công. */
  unpaid_late_sessions: number;
  /** Tiền bị trừ vì các buổi không tính công ở trên. */
  late_deduction: number;
  total_pay: number;
}

/**
 * Lương = số buổi "Đã dạy" × đơn giá, cộng buổi học thử theo giá riêng, trừ
 * các buổi điểm danh bù vượt hạn mức.
 *
 * Quy định điểm danh bù: mỗi kỳ tính lương, `quota` lần đầu vẫn được tính công
 * bình thường; từ lần kế tiếp trở đi buổi đó không tính công, vì điểm danh và
 * ghi nội dung bài học đúng buổi là việc bắt buộc — khách hàng đọc phần nội
 * dung đó trong trang học viên. Buổi học thử không nằm trong diện trừ.
 */
export function computePayroll(from: string, to: string, quota?: number): PayrollRow[] {
  const freeQuota = quota ?? getLateCheckinQuota();
  const rows = db
    .prepare(
      `SELECT u.id as teacher_id, u.name as teacher_name, u.pay_per_session as pay_per_session,
              SUM(CASE WHEN a.id IS NOT NULL AND a.is_trial = 0 THEN 1 ELSE 0 END) as completed_sessions,
              SUM(CASE WHEN a.id IS NOT NULL AND a.is_trial = 1 THEN 1 ELSE 0 END) as trial_sessions,
              SUM(CASE WHEN a.id IS NOT NULL AND a.is_trial = 0 AND a.late_checkin = 1 THEN 1 ELSE 0 END) as late_sessions
       FROM users u
       LEFT JOIN attendance a ON a.teacher_id = u.id
         AND a.status = 'completed' AND a.session_date >= ? AND a.session_date <= ?
       WHERE u.role = 'teacher'
       GROUP BY u.id
       ORDER BY u.name`
    )
    .all(from, to) as Omit<
    PayrollRow,
    "total_pay" | "unpaid_late_sessions" | "late_deduction"
  >[];

  return rows.map((r) => {
    const unpaid = Math.max(0, r.late_sessions - freeQuota);
    const rate = r.pay_per_session || 0;
    const deduction = rate * unpaid;
    return {
      ...r,
      unpaid_late_sessions: unpaid,
      late_deduction: deduction,
      total_pay: rate * r.completed_sessions + TRIAL_SESSION_RATE * r.trial_sessions - deduction,
    };
  });
}

export function listPayments(
  from: string,
  to: string
): (PaymentRow & { student_name: string | null; guardian_name: string | null })[] {
  return db
    .prepare(
      `SELECT p.*, c.student_name as student_name, c.guardian_name as guardian_name
       FROM payments p
       LEFT JOIN classes c ON c.id = p.class_id
       WHERE p.paid_at >= ? AND p.paid_at <= ?
       ORDER BY p.paid_at DESC, p.id DESC`
    )
    .all(from, to) as (PaymentRow & {
    student_name: string | null;
    guardian_name: string | null;
  })[];
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

/** Đăng ký học thử từ trang chủ, mới nhất lên đầu. */
export function listTrialRequests(status?: TrialRequestStatus): TrialRequestRow[] {
  const sql = status
    ? "SELECT * FROM trial_requests WHERE status = ? ORDER BY created_at DESC, id DESC"
    : "SELECT * FROM trial_requests ORDER BY created_at DESC, id DESC";
  return (status ? db.prepare(sql).all(status) : db.prepare(sql).all()) as TrialRequestRow[];
}

/** Số đăng ký học thử chưa ai đụng tới — hiện thành badge ở menu admin. */
export function countNewTrialRequests(): number {
  return (
    db.prepare("SELECT COUNT(*) as c FROM trial_requests WHERE status = 'new'").get() as {
      c: number;
    }
  ).c;
}

// ---------------------------------------------------------------------------
// Cấu hình trung tâm (bảng settings)
// ---------------------------------------------------------------------------

export function getSetting(key: string): string | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value);
}

export const CONTACT_KEYS = { facebook: "contact_facebook", zalo: "contact_zalo" } as const;

export const LATE_CHECKIN_QUOTA_KEY = "late_checkin_free_quota";

/** Số lần điểm danh bù được tha mỗi kỳ lương — lấy từ Cài đặt, chưa khai thì dùng mặc định. */
export function getLateCheckinQuota(): number {
  const raw = getSetting(LATE_CHECKIN_QUOTA_KEY);
  const n = raw == null ? NaN : Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : LATE_CHECKIN_FREE_QUOTA;
}

/**
 * Facebook + Zalo của trung tâm, dùng cho nút liên hệ ở trang chủ và trang học
 * viên. Chưa khai thì trả null và nút tương ứng không hiện — thà thiếu một nút
 * còn hơn dẫn khách tới link sai.
 */
export function getCenterContact(): CenterContact {
  return {
    facebook: getSetting(CONTACT_KEYS.facebook) || null,
    zalo: getSetting(CONTACT_KEYS.zalo) || null,
  };
}

// ---------------------------------------------------------------------------
// Nhắc lịch + xin dời buổi
// ---------------------------------------------------------------------------

export interface UpcomingSession {
  cls: ClassWithTeacher;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
  /** 0 = hôm nay, 1 = ngày mai... */
  daysAway: number;
  /** Buổi bù đã chốt từ một buổi bị dời trước đó. */
  isMakeup: boolean;
  /** Đơn xin dời buổi này đang chờ duyệt, nếu có. */
  pendingRequest: RescheduleRequestRow | null;
  /** Học viên đã bấm "Xác nhận tham gia" cho buổi này. */
  confirmed: boolean;
  /**
   * Buổi đã có trong sổ điểm danh nhưng chưa dạy (xin nghỉ, dời lịch, GV vắng)
   * — vẫn hiện để học viên thấy kết quả yêu cầu của mình, chỉ là hết thao tác
   * được. `null` là buổi bình thường chưa ghi gì.
   */
  recorded: { status: AttendanceStatus; countsAsUsed: boolean } | null;
}

/**
 * Các buổi sắp tới của học viên trong `days` ngày tới, để nhắc lịch ngay đầu
 * trang. Gồm buổi cố định hàng tuần (trừ những buổi đã điểm danh rồi) và buổi
 * học bù đã chốt. Lớp linh động không có lịch cố định nên không nhắc được.
 */
export function listUpcomingSessionsForStudent(
  studentUserId: number,
  days = REMINDER_DAYS
): UpcomingSession[] {
  const classes = listClassesForStudent(studentUserId).filter((c) => c.status === "active");
  if (classes.length === 0) return [];

  const classIds = classes.map((c) => c.id);
  const placeholders = classIds.map(() => "?").join(",");
  const today = now();
  const todayStr = toISODate(today);
  const lastStr = toISODate(addDays(today, days - 1));

  // Buổi đã dạy xong thì thôi nhắc; buổi đã ghi nhưng chưa dạy (xin nghỉ, dời
  // lịch) vẫn hiện kèm trạng thái, để học viên thấy yêu cầu của mình đã vào sổ.
  const recordedByKey = new Map<string, { status: AttendanceStatus; countsAsUsed: boolean }>();
  const doneKeys = new Set<string>();
  for (const a of db
    .prepare(
      `SELECT class_id, session_date, status, counts_as_used FROM attendance
       WHERE class_id IN (${placeholders}) AND session_date >= ?`
    )
    .all(...classIds, todayStr) as {
    class_id: number;
    session_date: string;
    status: AttendanceStatus;
    counts_as_used: number;
  }[]) {
    const key = `${a.class_id}|${a.session_date}`;
    if (a.status === "completed") doneKeys.add(key);
    else recordedByKey.set(key, { status: a.status, countsAsUsed: !!a.counts_as_used });
  }

  const confirmed = listConfirmedSessions(classIds, todayStr);

  const pendingByKey = new Map<string, RescheduleRequestRow>();
  for (const r of db
    .prepare(
      `SELECT * FROM reschedule_requests
       WHERE class_id IN (${placeholders}) AND status = 'pending'`
    )
    .all(...classIds) as RescheduleRequestRow[]) {
    pendingByKey.set(`${r.class_id}|${r.session_date}`, r);
  }

  const out: UpcomingSession[] = [];

  for (const cls of classes) {
    if (cls.schedule_type !== "fixed") continue;
    for (let i = 0; i < days; i++) {
      const date = addDays(today, i);
      if (date.getDay() !== cls.day_of_week) continue;
      const iso = toISODate(date);
      const key = `${cls.id}|${iso}`;
      if (doneKeys.has(key)) continue;
      out.push({
        cls,
        date: iso,
        time: cls.start_time,
        daysAway: i,
        isMakeup: false,
        pendingRequest: pendingByKey.get(key) ?? null,
        confirmed: confirmed.has(key),
        recorded: recordedByKey.get(key) ?? null,
      });
    }
  }

  // Buổi bù đã chốt: nằm trong chính bản ghi điểm danh của buổi bị dời.
  const makeups = db
    .prepare(
      `SELECT class_id, rescheduled_to_date as date, rescheduled_to_time as time FROM attendance
       WHERE class_id IN (${placeholders}) AND rescheduled_to_date IS NOT NULL
         AND rescheduled_to_date >= ? AND rescheduled_to_date <= ?`
    )
    .all(...classIds, todayStr, lastStr) as {
    class_id: number;
    date: string;
    time: string | null;
  }[];
  const byId = new Map(classes.map((c) => [c.id, c]));
  for (const m of makeups) {
    const cls = byId.get(m.class_id);
    if (!cls) continue;
    out.push({
      cls,
      date: m.date,
      time: m.time || cls.start_time,
      daysAway: Math.round(
        (new Date(`${m.date}T00:00:00`).getTime() -
          new Date(`${todayStr}T00:00:00`).getTime()) /
          86400000
      ),
      isMakeup: true,
      pendingRequest: null,
      confirmed: confirmed.has(`${cls.id}|${m.date}`),
      recorded: null,
    });
  }

  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export interface RescheduleRequestWithContext extends RescheduleRequestRow {
  student_name: string;
  guardian_name: string | null;
  subject: string;
  teacher_id: number | null;
  teacher_name: string | null;
  duration_minutes: number;
  requester_name: string;
}

export function listRescheduleRequests(filter?: {
  teacherId?: number;
  studentUserId?: number;
  status?: RescheduleStatus;
  limit?: number;
}): RescheduleRequestWithContext[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (filter?.teacherId) {
    clauses.push("c.teacher_id = @teacherId");
    params.teacherId = filter.teacherId;
  }
  if (filter?.studentUserId) {
    clauses.push("r.requested_by = @studentUserId");
    params.studentUserId = filter.studentUserId;
  }
  if (filter?.status) {
    clauses.push("r.status = @status");
    params.status = filter.status;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = filter?.limit ? `LIMIT ${Number(filter.limit)}` : "";
  return db
    .prepare(
      `SELECT r.*, c.student_name, c.guardian_name, c.subject, c.teacher_id, c.duration_minutes,
              t.name as teacher_name, u.name as requester_name
       FROM reschedule_requests r
       JOIN classes c ON c.id = r.class_id
       LEFT JOIN users t ON t.id = c.teacher_id
       JOIN users u ON u.id = r.requested_by
       ${where}
       ORDER BY r.status = 'pending' DESC, r.created_at DESC ${limit}`
    )
    .all(params) as RescheduleRequestWithContext[];
}

/** Số đơn xin dời buổi đang chờ duyệt — hiện thành badge ở menu. */
export function countPendingRescheduleRequests(teacherId?: number): number {
  const sql = teacherId
    ? `SELECT COUNT(*) as c FROM reschedule_requests r JOIN classes c ON c.id = r.class_id
       WHERE r.status = 'pending' AND c.teacher_id = ?`
    : "SELECT COUNT(*) as c FROM reschedule_requests WHERE status = 'pending'";
  return (
    (teacherId ? db.prepare(sql).get(teacherId) : db.prepare(sql).get()) as { c: number }
  ).c;
}

/**
 * Khoá "classId|ngày" của những buổi học viên đã xác nhận tham gia, từ `from`
 * trở đi. Trả về Set để trang nào cũng tra được bằng một truy vấn.
 */
export function listConfirmedSessions(classIds: number[], from?: string): Set<string> {
  if (classIds.length === 0) return new Set();
  const placeholders = classIds.map(() => "?").join(",");
  const sql = `SELECT class_id, session_date FROM session_confirmations
     WHERE class_id IN (${placeholders})${from ? " AND session_date >= ?" : ""}`;
  const params = from ? [...classIds, from] : classIds;
  const rows = db.prepare(sql).all(...params) as { class_id: number; session_date: string }[];
  return new Set(rows.map((r) => `${r.class_id}|${r.session_date}`));
}

/** Lớp nào đã được học viên xác nhận tham gia trong đúng một ngày — dùng cho trang "Hôm nay". */
export function listConfirmedClassIdsOn(sessionDate: string): Set<number> {
  const rows = db
    .prepare("SELECT class_id FROM session_confirmations WHERE session_date = ?")
    .all(sessionDate) as { class_id: number }[];
  return new Set(rows.map((r) => r.class_id));
}

// ---------------------------------------------------------------------------
// Quên điểm danh / điểm danh bù
// ---------------------------------------------------------------------------

export interface MissedCheckin {
  cls: ClassWithTeacher;
  /** YYYY-MM-DD của buổi đã qua mà chưa có bản ghi điểm danh. */
  date: string;
  /** Đã trễ bao nhiêu ngày so với hôm nay. */
  daysLate: number;
}

/**
 * Buổi học cố định đã qua giờ mà chưa ai điểm danh — giáo viên còn nợ cả điểm
 * danh lẫn nội dung bài học cho khách. Chỉ tính từ ngày lớp được tạo trở đi và
 * trong `days` ngày gần nhất, để lớp mới nhập không kéo theo một đống buổi cũ
 * chưa từng tồn tại.
 */
export function listMissedCheckins(opts?: {
  teacherId?: number;
  days?: number;
}): MissedCheckin[] {
  const days = opts?.days ?? MISSED_CHECKIN_DAYS;
  const today = now();
  const todayStr = toISODate(today);
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const fromStr = toISODate(addDays(today, -days));

  const classes = (
    opts?.teacherId ? listClassesForTeacher(opts.teacherId) : listClasses()
  ).filter((c) => c.status === "active" && c.schedule_type === "fixed" && c.teacher_id);
  if (classes.length === 0) return [];

  const classIds = classes.map((c) => c.id);
  const placeholders = classIds.map(() => "?").join(",");
  const marked = new Set(
    (
      db
        .prepare(
          `SELECT class_id, session_date FROM attendance
           WHERE class_id IN (${placeholders}) AND session_date >= ?`
        )
        .all(...classIds, fromStr) as { class_id: number; session_date: string }[]
    ).map((a) => `${a.class_id}|${a.session_date}`)
  );

  const out: MissedCheckin[] = [];
  for (const cls of classes) {
    const createdDate = cls.created_at.slice(0, 10);
    for (let i = 1; i <= days; i++) {
      const date = addDays(today, -i);
      if (date.getDay() !== cls.day_of_week) continue;
      const iso = toISODate(date);
      if (iso < fromStr || iso < createdDate) continue;
      if (marked.has(`${cls.id}|${iso}`)) continue;
      out.push({ cls, date: iso, daysLate: i });
    }
    // Buổi hôm nay chỉ tính là quên khi đã qua giờ kết thúc.
    if (today.getDay() === cls.day_of_week && todayStr >= createdDate) {
      const [h, m] = cls.start_time.split(":").map(Number);
      if (nowMinutes > h * 60 + m + cls.duration_minutes && !marked.has(`${cls.id}|${todayStr}`)) {
        out.push({ cls, date: todayStr, daysLate: 0 });
      }
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.cls.start_time.localeCompare(b.cls.start_time));
}

/** Số buổi quên điểm danh của từng giáo viên — dùng cho bảng lương và trang giáo vụ. */
export function countMissedCheckinsByTeacher(days?: number): Map<number, number> {
  const counts = new Map<number, number>();
  for (const m of listMissedCheckins({ days })) {
    if (m.cls.teacher_id == null) continue;
    counts.set(m.cls.teacher_id, (counts.get(m.cls.teacher_id) ?? 0) + 1);
  }
  return counts;
}
