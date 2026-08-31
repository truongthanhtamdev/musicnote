import { formatTimeRange } from "./format";

export type Role = "admin" | "coordinator" | "teacher" | "student";

export function roleHomePath(role: Role): string {
  if (role === "teacher") return "/teacher";
  if (role === "student") return "/student";
  return "/admin";
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  phone: string | null;
  pay_per_session: number | null;
  languages: string; // comma-separated: "vi" | "vi,en"
  subjects: string; // comma-separated free text, e.g. "Guitar,Piano"; empty = not specified (matches any)
  active: number;
  created_at: string;
}

export type ClassLanguage = "vi" | "en";
export type ClassSource = "center" | "self";
export type ClassScheduleType = "fixed" | "flexible";
export type ClassStatus = "active" | "paused" | "ended";

export interface ClassRow {
  id: number;
  student_name: string;
  student_phone: string | null;
  guardian_name: string | null;
  student_user_id: number | null;
  level: string | null;
  subject: string;
  language: ClassLanguage;
  source: ClassSource;
  package_id: number | null;
  schedule_type: ClassScheduleType;
  // For schedule_type === "flexible" these are placeholders (day_of_week: -1,
  // start_time: "") — there is no fixed weekly slot, so every session is
  // checked in ad-hoc via the "buổi học bù" flow instead of the daily list.
  day_of_week: number; // 0=CN..6=T7 (JS getDay convention)
  start_time: string; // HH:MM
  duration_minutes: number;
  teacher_id: number | null;
  status: ClassStatus;
  notes: string | null;
  created_at: string;
}

export interface PackageRow {
  id: number;
  total_sessions: number;
  started_at: string;
  created_at: string;
}

export interface PaymentRow {
  id: number;
  class_id: number | null;
  amount: number;
  paid_at: string;
  note: string | null;
  created_at: string;
}

export interface ExpenseRow {
  id: number;
  category: string;
  amount: number;
  expense_date: string;
  note: string | null;
  created_at: string;
}

export const EXPENSE_CATEGORY_SUGGESTIONS = ["Quảng cáo (Ads)", "Vận hành", "Mặt bằng", "Khác"];

/**
 * Suggested tuition price per package size, keyed by subject then total
 * sessions. Not a strict per-tiết ratio (bigger packages are discounted), so
 * each size is listed explicitly rather than derived. Missing subject/size
 * combos (e.g. 100 tiết, or a custom typed-in subject) have no suggestion —
 * admin types the amount manually in that case.
 */
const GUITAR_PACKAGE_PRICES: Record<number, number> = { 20: 7_500_000, 50: 15_000_000 };
const OTHER_SUBJECT_PACKAGE_PRICES: Record<number, number> = { 20: 8_000_000, 50: 16_000_000 };
const OTHER_PRICED_SUBJECTS = ["Piano", "Violin", "Thanh nhạc"];

export function getSuggestedPackagePrice(
  subject: string,
  totalSessions: number
): number | null {
  if (subject === "Guitar") return GUITAR_PACKAGE_PRICES[totalSessions] ?? null;
  if (OTHER_PRICED_SUBJECTS.includes(subject)) return OTHER_SUBJECT_PACKAGE_PRICES[totalSessions] ?? null;
  return null;
}

export interface AvailabilityRow {
  id: number;
  teacher_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export type AttendanceStatus =
  | "completed"
  | "teacher_absent"
  | "student_absent"
  | "rescheduled";

export interface AttendanceRow {
  id: number;
  class_id: number;
  teacher_id: number;
  session_date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  fb_checkin_confirmed: number;
  lesson_content: string | null;
  is_trial: number;
  note: string | null;
  // Only meaningful when hasRescheduleInfo(status): the date/time the
  // teacher and student agreed to move this session to.
  rescheduled_to_date: string | null;
  rescheduled_to_time: string | null;
  created_at: string;
}

export const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const SUBJECT_SUGGESTIONS = ["Guitar", "Piano", "Violin", "Saxophone", "Thanh nhạc"];

export const PACKAGE_OPTIONS = [20, 50, 100];

/** Flat rate paid to the teacher for a trial ("buổi thử") session, regardless of their normal per-session rate. */
export const TRIAL_SESSION_RATE = 50000;

export const LANGUAGE_LABELS: Record<ClassLanguage, string> = {
  vi: "Tiếng Việt",
  en: "Tiếng Anh",
};

export const SOURCE_LABELS: Record<ClassSource, string> = {
  center: "Trung tâm giao",
  self: "GV tự tìm học viên",
};

export const SCHEDULE_TYPE_LABELS: Record<ClassScheduleType, string> = {
  fixed: "Cố định hàng tuần",
  flexible: "Linh động (hẹn từng buổi)",
};

export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  active: "Đang học",
  paused: "Tạm dừng",
  ended: "Đã kết thúc",
};

/** Human-readable weekly slot, or "Linh động" for a class with no fixed day/time. */
export function formatClassSchedule(
  cls: Pick<ClassRow, "schedule_type" | "day_of_week" | "start_time" | "duration_minutes">
): string {
  if (cls.schedule_type === "flexible") return "Linh động";
  return `${DAY_LABELS[cls.day_of_week]} ${formatTimeRange(cls.start_time, cls.duration_minutes)}`;
}

export function parseLanguages(csv: string): ClassLanguage[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ClassLanguage => s === "vi" || s === "en");
}

export function parseSubjects(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  completed: "Đã dạy",
  teacher_absent: "GV vắng",
  student_absent: "HS vắng",
  rescheduled: "Dời lịch",
};

/** Any status but "completed" can carry an agreed makeup date/time (a miss still needs one). */
export function hasRescheduleInfo(status: AttendanceStatus): boolean {
  return status !== "completed";
}
