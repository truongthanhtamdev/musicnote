/**
 * Kiểu và hằng số của khách tiềm năng.
 *
 * Tách khỏi lib/leads vì file đó nói chuyện thẳng với cơ sở dữ liệu, mà mấy
 * component chạy trên trình duyệt cũng cần đúng danh sách giai đoạn và nhãn.
 * Nhập nhầm file kia vào client là kéo theo cả better-sqlite3 rồi hỏng build.
 */

export const LEAD_STAGES = [
  "new",
  "talking",
  "callback",
  "trial_booked",
  "won",
  "lost",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: "Mới nhắn",
  talking: "Đang trao đổi",
  callback: "Hẹn liên hệ lại",
  trial_booked: "Đã đặt học thử",
  won: "Đã chốt lớp",
  lost: "Không theo nữa",
};

/** Giai đoạn còn phải chăm; hai giai đoạn cuối coi như đã xong. */
export const OPEN_STAGES: LeadStage[] = ["new", "talking", "callback", "trial_booked"];

export const LEAD_STAGE_TONE: Record<LeadStage, string> = {
  new: "bg-coral-50 text-coral-700",
  talking: "bg-wood-50 text-wood-700",
  callback: "bg-amber-50 text-amber-700",
  trial_booked: "bg-navy-100 text-navy-800",
  won: "bg-mint-50 text-mint-700",
  lost: "bg-ivory-100 text-ink-500",
};

export interface LeadRow {
  id: number;
  name: string;
  phone: string | null;
  facebook_url: string | null;
  subject: string | null;
  source: string | null;
  stage: LeadStage;
  next_follow_up: string | null;
  note: string | null;
  coordinator_id: number | null;
  coordinator_name: string | null;
  converted_class_id: number | null;
  created_at: string;
  updated_at: string;
}
