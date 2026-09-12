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
  /**
   * Mã lớp trong bảng Excel của trung tâm (VD "G2403022"). Là khoá để nhập lại
   * file mà không tạo lớp trùng; lớp thêm tay trong hệ thống thì để trống.
   */
  code: string | null;
  /** Trạng thái nghiệp vụ chi tiết (xem CLASS_STAGES); `status` được suy ra từ đây. */
  stage: ClassStage;
  /** Ngày dự kiến học lại, chỉ có nghĩa khi stage đang là một trạng thái Tạm OFF. */
  paused_until: string | null;
  created_at: string;
}

export interface PackageRow {
  id: number;
  total_sessions: number;
  /** Số buổi trung tâm tặng thêm — cộng vào tổng nhưng khách không trả tiền. */
  bonus_sessions: number;
  /** Khách đã đăng ký bao nhiêu khóa tính tới gói này (khóa 1, khóa 2...). */
  course_count: number;
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
  /**
   * Buổi được điểm danh sau ngày học (điểm danh bù) thay vì ngay hôm đó. Đặt
   * lúc giáo viên tạo bản ghi; sửa lại sau này không làm thay đổi cờ.
   */
  late_checkin: number;
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
 * Báo nghỉ trước bấy nhiêu tiếng thì mới coi là "có báo" và không bị trừ tiết.
 * Sát giờ hơn thì giáo viên đã dành sẵn khung đó rồi, không nhận lớp khác
 * được nữa, nên buổi vẫn tính vào gói.
 */
export const CANCEL_NOTICE_HOURS = 12;

/** Buổi học báo nghỉ lúc này thì còn được miễn trừ tiết không? */
export function isNoticeInTime(sessionDate: string, startTime: string, at: Date): boolean {
  const [h, m] = startTime.split(":").map(Number);
  const [y, mo, d] = sessionDate.split("-").map(Number);
  const startsAt = new Date(y, mo - 1, d, h, m);
  return startsAt.getTime() - at.getTime() >= CANCEL_NOTICE_HOURS * 60 * 60 * 1000;
}

/**
 * Số lần điểm danh bù được "tha" trong mỗi kỳ tính lương. Từ lần thứ
 * LATE_CHECKIN_FREE_QUOTA + 1 trở đi, buổi điểm danh bù không được tính công —
 * điểm danh và ghi nội dung bài học đúng buổi là việc bắt buộc, vì khách hàng
 * đọc phần nội dung đó. Chủ trung tâm đổi được trong "Cài đặt trung tâm".
 */
export const LATE_CHECKIN_FREE_QUOTA = 2;

/** Truy ngược bấy nhiêu ngày để tìm buổi giáo viên quên điểm danh. */
export const MISSED_CHECKIN_DAYS = 30;

/**
 * Nhắc lịch cho học viên trong vòng bấy nhiêu ngày tới. Đủ dài để sau khi xin
 * nghỉ một buổi, học viên thấy ngay buổi kế tiếp của tuần sau thay vì thấy
 * danh sách trống.
 */
export const REMINDER_DAYS = 14;

/** Học viên chọn giờ học bù trong vòng bấy nhiêu ngày tới. */
export const MAKEUP_WINDOW_DAYS = 21;

export const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Giờ sớm nhất trung tâm nhận lớp. */
export const DAY_START_HOUR = 5;

/**
 * Nhãn giờ theo bước 30 phút từ 05:00 đến 23:30, dùng chung cho mọi lưới
 * ngày×giờ và ô chọn giờ. Mở từ 5 giờ sáng vì trung tâm có nhận lớp sớm, và
 * kéo tới 23:30 vì cũng có lớp tối muộn — lớp 23:00 dài 60 phút kết thúc
 * đúng 24:00.
 */
export const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = DAY_START_HOUR; h < 24; h++) {
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

/**
 * Trạng thái nghiệp vụ của lớp theo đúng bảng màu trung tâm đang dùng tay.
 * Chi tiết hơn `status` rất nhiều vì phần lớn nói về chuyện học phí.
 *
 * `status` (Đang học / Tạm dừng / Đã kết thúc) vẫn giữ nguyên và là thứ duy
 * nhất chi phối lịch dạy, điểm danh, lương — mỗi stage chỉ khai nó thuộc nhóm
 * nào rồi hệ thống tự đặt `status` theo. Nhờ vậy sau này thêm/đổi tên một
 * trạng thái nghiệp vụ không bao giờ làm hỏng phần tính tiết hay chấm công.
 */
export type ClassStage =
  | "trial"
  | "trial_awaiting_fee"
  | "dropped"
  | "new_course_paid"
  | "studying_unpaid"
  | "studying_partial"
  | "studying"
  | "done"
  | "paused"
  | "paused_partial"
  | "new_course_announced"
  | "new_course_awaiting"
  | "study_later"
  | "not_studying";

export interface ClassStageInfo {
  value: ClassStage;
  label: string;
  /** Lớp này có đang chạy lịch không — nguồn để suy ra `status`. */
  status: ClassStatus;
  /** Lớp đang nghỉ tạm, cần khai ngày quay lại. */
  paused: boolean;
  /** Màu nền/chữ đúng như bảng màu trung tâm đang dùng. */
  className: string;
}

export const CLASS_STAGES: ClassStageInfo[] = [
  { value: "trial", label: "Học thử", status: "active", paused: false, className: "bg-[#0f9b8e] text-white" },
  { value: "trial_awaiting_fee", label: "Đã học thử, chờ đóng HP", status: "active", paused: false, className: "bg-[#7ec8e3] text-ink-900" },
  { value: "dropped", label: "Rớt lớp", status: "ended", paused: false, className: "bg-[#e81123] text-white font-bold" },
  { value: "new_course_paid", label: "Đã đóng HP khóa mới", status: "active", paused: false, className: "bg-[#7bc043] text-ink-900" },
  { value: "studying_unpaid", label: "Đang học, chưa đóng HP", status: "active", paused: false, className: "bg-[#ffe600] text-ink-900" },
  { value: "studying_partial", label: "Đang học, chưa hoàn thành HP", status: "active", paused: false, className: "bg-[#ff9a2e] text-ink-900" },
  { value: "studying", label: "Đang học", status: "active", paused: false, className: "bg-white text-ink-900 border border-navy-200" },
  { value: "done", label: "DONE", status: "ended", paused: false, className: "bg-white text-[#e81123] font-bold border border-navy-200" },
  { value: "paused", label: "Tạm OFF", status: "paused", paused: true, className: "bg-[#9a9a9a] text-white italic" },
  { value: "paused_partial", label: "Tạm OFF – Chưa hoàn thành HP", status: "paused", paused: true, className: "bg-[#9a9a9a] text-white italic" },
  { value: "new_course_announced", label: "Báo HP khóa mới", status: "active", paused: false, className: "bg-[#5bc8f5] text-ink-900" },
  { value: "new_course_awaiting", label: "Chờ đóng HP (khóa mới)", status: "active", paused: false, className: "bg-[#dda0dd] text-ink-900" },
  { value: "study_later", label: "Hẹn học sau", status: "paused", paused: true, className: "bg-[#111111] text-white" },
  { value: "not_studying", label: "Không học", status: "ended", paused: false, className: "bg-[#111111] text-white" },
];

const STAGE_BY_VALUE = new Map(CLASS_STAGES.map((s) => [s.value, s]));

/** Thông tin của một stage; giá trị lạ (dữ liệu cũ) thì coi như "Đang học". */
export function classStage(value: string): ClassStageInfo {
  return STAGE_BY_VALUE.get(value as ClassStage) ?? STAGE_BY_VALUE.get("studying")!;
}

/** `status` suy ra từ stage — chỉ dùng ở chỗ ghi dữ liệu, không đoán lại khi đọc. */
export function statusForStage(value: string): ClassStatus {
  return classStage(value).status;
}

/** Stage mặc định khi chưa khai, suy ngược từ status cũ. */
export function defaultStageForStatus(status: ClassStatus): ClassStage {
  if (status === "paused") return "paused";
  if (status === "ended") return "done";
  return "studying";
}

/** Báo trước bấy nhiêu ngày khi lớp Tạm OFF sắp tới hạn quay lại. */
export const PAUSE_RETURN_WARNING_DAYS = 7;

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
