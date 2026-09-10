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
  /** Link Facebook của khách hàng, để nhắn tin liên hệ nhanh. */
  facebook_url: string | null;
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
  /** 1 while the class is still waiting on its first session, which counts as the trial ("buổi 0"). */
  trial_pending: number;
  created_at: string;
}

export interface PackageRow {
  id: number;
  total_sessions: number;
  started_at: string;
  /** A manually-entered baseline for "sessions used"; null = use the plain computed count. */
  used_override: number | null;
  /** When used_override was last set — completed attendance recorded after this counts on top of it. Null when used_override is null. */
  used_override_set_at: string | null;
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

export interface NotificationRow {
  id: number;
  user_id: number;
  message: string;
  class_id: number | null;
  read_at: string | null;
  created_at: string;
}

export type TrialRequestStatus = "new" | "contacted" | "done" | "cancelled";

/** Một lượt khách để lại thông tin xin học thử ở trang chủ. */
export interface TrialRequestRow {
  id: number;
  name: string;
  phone: string;
  /** Facebook/Zalo/email — cách liên hệ phụ khách tự khai. */
  contact: string | null;
  subject: string;
  language: ClassLanguage;
  note: string | null;
  status: TrialRequestStatus;
  created_at: string;
}

export const TRIAL_REQUEST_STATUS_LABELS: Record<TrialRequestStatus, string> = {
  new: "Mới",
  contacted: "Đã liên hệ",
  done: "Đã xếp lớp",
  cancelled: "Không học",
};

export const EXPENSE_CATEGORY_SUGGESTIONS = ["Quảng cáo (Ads)", "Vận hành", "Mặt bằng", "Khác"];

export interface PricingTier {
  sessions: number;
  /** Tên gói trên trang chủ, VD "Gói Khởi Đầu". */
  name: string;
  /** Học phí trọn gói (VNĐ); null = chưa niêm yết → trang chủ hiện "Liên hệ", hệ thống để admin tự gõ. */
  price: number | null;
  /** Giá niêm yết cho học viên trả bằng USD, nếu có. */
  priceUSD?: number;
  /** Nhãn nổi trên thẻ giá, VD "Phổ biến nhất". */
  badge?: string;
  features: string[];
}

const ONE_ON_ONE = "Học 1 kèm 1 online qua Zoom/Meet";

/**
 * Bảng giá niêm yết trên trang chủ, đồng thời là nguồn để tự điền học phí
 * lúc thu tiền — sửa giá một chỗ là cả hai nơi đổi cùng nhau, không bao giờ
 * có chuyện trang chủ ghi một đằng hệ thống tính một nẻo.
 *
 * Bộ môn không có trong bảng này (VD Saxophone, hoặc môn admin tự gõ) thì
 * không có giá gợi ý, admin nhập số tiền bằng tay.
 */
export const PRICING: { subject: string; tiers: PricingTier[] }[] = [
  {
    subject: "Guitar",
    tiers: [
      {
        sessions: 20,
        name: "Gói Khởi Đầu",
        price: 7_500_000,
        priceUSD: 300,
        features: [
          ONE_ON_ONE,
          "8+ hợp âm cơ bản và barre",
          "Strumming & Fingerpicking",
          "Đọc tab guitar",
          "3–5 bài nhạc hoàn chỉnh",
          "Hỗ trợ qua tin nhắn",
          "Chứng nhận hoàn thành",
        ],
      },
      {
        sessions: 50,
        name: "Gói Nâng Cao",
        price: 15_000_000,
        priceUSD: 600,
        badge: "Phổ biến nhất",
        features: [
          ONE_ON_ONE,
          "Toàn bộ nội dung gói 20 buổi",
          "Solo guitar & lead playing",
          "Fingerstyle nâng cao",
          "Lý thuyết âm nhạc cơ bản",
          "10+ bài nhạc đa thể loại",
          "Ưu tiên đặt lịch & hỗ trợ 24/7",
        ],
      },
      {
        sessions: 100,
        name: "Gói Toàn Diện",
        price: 28_000_000,
        badge: "Tiết kiệm nhất",
        features: [
          "Toàn bộ nội dung gói 50 buổi",
          "Sáng tác & improvisation",
          "Pop, Folk, Ballad, Fingerstyle",
          "20+ bài nhạc đa thể loại",
          "Tự học bài mới độc lập",
          "Video ghi lại từng buổi học",
          "Mini concert tốt nghiệp",
        ],
      },
    ],
  },
  {
    subject: "Piano",
    tiers: [
      {
        sessions: 20,
        name: "Gói Khởi Đầu",
        price: 8_000_000,
        priceUSD: 325,
        features: [
          ONE_ON_ONE,
          "Kỹ thuật tay trái & tay phải",
          "Đọc nốt nhạc cơ bản",
          "Hòa âm & đệm bài hát",
          "3–5 bài nhạc hoàn chỉnh",
          "Hỗ trợ qua tin nhắn",
          "Chứng nhận hoàn thành",
        ],
      },
      {
        sessions: 50,
        name: "Gói Nâng Cao",
        price: 16_000_000,
        priceUSD: 650,
        badge: "Phổ biến nhất",
        features: [
          ONE_ON_ONE,
          "Toàn bộ nội dung gói 20 buổi",
          "Kỹ thuật nâng cao: pedal, dynamics",
          "Lý thuyết âm nhạc & hòa âm",
          "10+ bài nhạc đa thể loại",
          "Ưu tiên đặt lịch & hỗ trợ 24/7",
          "Video ghi lại từng buổi học",
        ],
      },
      {
        sessions: 100,
        name: "Gói Toàn Diện",
        price: 30_000_000,
        badge: "Tiết kiệm nhất",
        features: [
          "Toàn bộ nội dung gói 50 buổi",
          "Hòa âm nâng cao & nhạc lý",
          "Pop, Ballad, Bossa Nova, Classic nhẹ",
          "20+ bài nhạc đa thể loại",
          "Tự sáng tạo intro/outro riêng",
          "Video ghi lại từng buổi học",
          "Mini concert tốt nghiệp",
        ],
      },
    ],
  },
  // Violin và Thanh nhạc: mới có giá gói 20/50 (bằng Piano, theo bảng giá cũ
  // của hệ thống). Gói 100 và danh sách nội dung chưa lấy được từ trang chủ
  // nên để trống — bổ sung khi có.
  {
    subject: "Violin",
    tiers: [
      { sessions: 20, name: "Gói Khởi Đầu", price: 8_000_000, features: [ONE_ON_ONE] },
      { sessions: 50, name: "Gói Nâng Cao", price: 16_000_000, badge: "Phổ biến nhất", features: [ONE_ON_ONE] },
      { sessions: 100, name: "Gói Toàn Diện", price: null, features: [] },
    ],
  },
  {
    subject: "Thanh nhạc",
    tiers: [
      { sessions: 20, name: "Gói Khởi Đầu", price: 8_000_000, features: [ONE_ON_ONE] },
      { sessions: 50, name: "Gói Nâng Cao", price: 16_000_000, badge: "Phổ biến nhất", features: [ONE_ON_ONE] },
      { sessions: 100, name: "Gói Toàn Diện", price: null, features: [] },
    ],
  },
];

export function getSuggestedPackagePrice(
  subject: string,
  totalSessions: number
): number | null {
  const tiers = PRICING.find((p) => p.subject === subject)?.tiers;
  return tiers?.find((t) => t.sessions === totalSessions)?.price ?? null;
}

/** A half-hour block a teacher has marked BUSY (personal, not a class) — everything else on the grid defaults to free. */
export interface BusySlotRow {
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
  /**
   * Buổi này vẫn trừ vào gói dù không dạy: khách vắng mà không báo trước nên
   * giáo viên đã giữ chỗ suốt khung giờ đó. Chỉ dùng cho "HS vắng"; các trạng
   * thái khác luôn là 0.
   */
  counts_as_used: number;
  created_at: string;
}

export interface RescheduleRequestRow {
  id: number;
  class_id: number;
  requested_by: number;
  /** Buổi gốc bị dời (YYYY-MM-DD). */
  session_date: string;
  to_date: string;
  to_time: string;
  reason: string | null;
  status: RescheduleStatus;
  response_note: string | null;
  responded_by: number | null;
  responded_at: string | null;
  created_at: string;
}

export type RescheduleStatus = "pending" | "approved" | "declined" | "cancelled";

export const RESCHEDULE_STATUS_LABELS: Record<RescheduleStatus, string> = {
  pending: "Chờ giáo viên duyệt",
  approved: "Đã duyệt",
  declined: "Không duyệt",
  cancelled: "Đã hủy",
};

export interface CenterContact {
  facebook: string | null;
  zalo: string | null;
}

/**
 * Báo dời/hủy trước bấy nhiêu tiếng thì mới coi là "có báo". Sát giờ hơn thì
 * giáo viên đã dành sẵn khung đó rồi, nên buổi vẫn bị tính tiết.
 */
export const CANCEL_NOTICE_HOURS = 12;

/** Nhắc lịch cho học viên trong vòng bấy nhiêu ngày tới. */
export const REMINDER_DAYS = 7;

/** Học viên chọn giờ học bù trong vòng bấy nhiêu ngày tới. */
export const MAKEUP_WINDOW_DAYS = 21;

export const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** 30-min time-of-day labels from 07:00 to 21:30, shared by every day×time schedule grid. */
export const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 7; h < 22; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
})();

export const DURATION_OPTIONS = [30, 45, 60, 90];

export const SUBJECT_SUGGESTIONS = ["Guitar", "Piano", "Violin", "Saxophone", "Thanh nhạc"];

export const PACKAGE_OPTIONS = [20, 50, 100];

/** Lớp tạo trong vòng bấy nhiêu ngày thì còn được coi là "mới", dùng để nhắc thu học phí. */
export const NEW_CLASS_DAYS = 30;

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

/**
 * Nhãn người đóng tiền: tên khách hàng (phụ huynh) đứng trước vì họ mới là
 * người thanh toán, tên học viên theo sau để phân biệt khi một khách hàng
 * đăng ký cho hai bé. Lớp chưa khai khách hàng thì chỉ còn tên học viên.
 */
export function formatPayerLabel(cls: Pick<ClassRow, "student_name" | "guardian_name">): string {
  return cls.guardian_name ? `${cls.guardian_name} · ${cls.student_name}` : cls.student_name;
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
