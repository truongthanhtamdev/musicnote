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
  package_total_sessions: number | null;
  package_started_at: string | null;
  day_of_week: number; // 0=CN..6=T7 (JS getDay convention)
  start_time: string; // HH:MM
  duration_minutes: number;
  teacher_id: number | null;
  status: "active" | "paused" | "ended";
  notes: string | null;
  created_at: string;
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
  note: string | null;
  created_at: string;
}

export const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const SUBJECT_SUGGESTIONS = ["Guitar", "Piano", "Violin", "Thanh nhạc"];

export const PACKAGE_OPTIONS = [20, 50, 100];

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
