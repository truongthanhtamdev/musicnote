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
  active: number;
  created_at: string;
}

export type ClassLanguage = "vi" | "en";
export type ClassSource = "center" | "self";

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
  day_of_week: number; // 0=CN..6=T7 (JS getDay convention)
  start_time: string; // HH:MM
  duration_minutes: number;
  teacher_id: number | null;
  status: "active" | "paused" | "ended";
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
  created_at: string;
}

export const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const SUBJECT_SUGGESTIONS = ["Guitar", "Piano", "Violin", "Thanh nhạc"];

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

export function parseLanguages(csv: string): ClassLanguage[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ClassLanguage => s === "vi" || s === "en");
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  completed: "Đã dạy",
  teacher_absent: "GV vắng",
  student_absent: "HS vắng",
  rescheduled: "Dời lịch",
};

/* ── Khách hàng tiềm năng (lead) từ Facebook ─────────────────────────── */

/**
 * Pipeline bán hàng, theo đúng thứ tự phễu. `won` = đã đăng ký (đã tạo lớp),
 * `lost` = từ chối hẳn, `cold` = tạm nguội (có thể chăm lại sau).
 */
export type LeadStatus =
  | "new"
  | "contacted"
  | "consulting"
  | "trial_scheduled"
  | "trial_done"
  | "won"
  | "lost"
  | "cold";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Mới",
  contacted: "Đã liên hệ",
  consulting: "Đang tư vấn",
  trial_scheduled: "Hẹn học thử",
  trial_done: "Đã học thử",
  won: "Đã chốt",
  lost: "Từ chối",
  cold: "Nguội",
};

/** Các bước của phễu, dùng cho báo cáo tỉ lệ rơi rụng giữa từng bước. */
export const LEAD_FUNNEL_STEPS: LeadStatus[] = [
  "new",
  "contacted",
  "consulting",
  "trial_scheduled",
  "trial_done",
  "won",
];

/** Lead còn phải chăm — chưa chốt và chưa bỏ. */
export const LEAD_OPEN_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "consulting",
  "trial_scheduled",
  "trial_done",
];

export function isOpenLeadStatus(status: string): boolean {
  return (LEAD_OPEN_STATUSES as string[]).includes(status);
}

export type LeadTemperature = "hot" | "warm" | "cold";

export const LEAD_TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  hot: "Nóng",
  warm: "Ấm",
  cold: "Lạnh",
};

/** Hình thức học khách hàng muốn. */
export type LeadLearningMode = "home_private" | "online" | "cafe_group" | "center";

export const LEARNING_MODE_LABELS: Record<LeadLearningMode, string> = {
  home_private: "1 kèm 1 tại nhà",
  online: "Học online",
  cafe_group: "Học nhóm tại quán cà phê",
  center: "Học tại trung tâm",
};

export function parseLearningMode(raw: string): LeadLearningMode {
  return raw === "online" || raw === "cafe_group" || raw === "center" ? raw : "home_private";
}

export const LEAD_SOURCE_SUGGESTIONS = [
  "Facebook Ads",
  "Inbox Fanpage",
  "Comment bài viết",
  "Group Facebook",
  "Bạn bè giới thiệu",
  "TikTok",
  "Zalo OA",
  "Website",
  "Khác",
];

export const LEAD_LOST_REASON_SUGGESTIONS = [
  "Học phí cao",
  "Ở xa / không có GV gần",
  "Không sắp xếp được lịch",
  "Chỉ hỏi cho biết",
  "Đã học chỗ khác",
  "Không liên lạc được",
  "Khác",
];

export interface LeadRow {
  id: number;
  name: string;
  phone: string | null;
  /** SĐT đã chuẩn hoá về dạng 0xxxxxxxxx — chỉ dùng để dò trùng. */
  phone_normalized: string | null;
  fb_name: string | null;
  fb_url: string | null;
  area: string | null;
  subject: string;
  learning_mode: LeadLearningMode;
  need: string | null;
  source: string;
  received_at: string; // YYYY-MM-DD
  status: LeadStatus;
  temperature: LeadTemperature;
  owner_id: number | null;
  next_follow_up: string | null; // YYYY-MM-DD
  expected_value: number | null;
  lost_reason: string | null;
  class_id: number | null;
  won_at: string | null;
  notes: string | null;
  created_at: string;
}

export type LeadNoteKind = "note" | "call" | "message" | "appointment" | "status";

export const LEAD_NOTE_KIND_LABELS: Record<LeadNoteKind, string> = {
  note: "Ghi chú",
  call: "Gọi điện",
  message: "Nhắn tin",
  appointment: "Hẹn gặp",
  status: "Đổi trạng thái",
};

export interface LeadNoteRow {
  id: number;
  lead_id: number;
  user_id: number | null;
  kind: LeadNoteKind;
  body: string;
  created_at: string;
}

/**
 * Đưa SĐT về dạng 0xxxxxxxxx để dò trùng: bỏ khoảng trắng/dấu chấm, đổi
 * +84 / 0084 / 84 thành 0. Chỉ dùng cho việc so khớp, số hiển thị vẫn giữ
 * nguyên như người nhập.
 */
export function normalizePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (!d) return "";
  d = d.replace(/^00/, "");
  if (d.startsWith("84")) d = "0" + d.slice(2);
  else if (!d.startsWith("0")) d = "0" + d;
  return d;
}

/** Link chat Zalo mở thẳng từ danh sách lead. */
export function zaloLink(phone: string): string {
  return `https://zalo.me/${normalizePhone(phone)}`;
}
