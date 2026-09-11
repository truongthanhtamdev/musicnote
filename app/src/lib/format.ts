/** Giờ của trung tâm. Đổi bằng biến môi trường APP_TIME_ZONE nếu cần. */
export const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Ho_Chi_Minh";

const ZONED_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/**
 * "Bây giờ" theo giờ trung tâm, không phụ thuộc múi giờ của máy chủ (VPS
 * đang chạy UTC). Trả về Date mà các hàm .getHours()/.getDay()/... đọc ra
 * đúng giờ Việt Nam, nên mọi chỗ tính ngày/giờ chỉ cần đổi `new Date()`
 * thành `now()` là khớp thực tế.
 */
export function now(): Date {
  const parts = ZONED_PARTS.formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
}

export function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

/** "HH:MM" thành số phút tính từ 00:00. */
export function toMinutesOfDay(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Giờ kết thúc tính từ 00:00, KHÔNG vòng qua nửa đêm — lớp 23:00 dài 60 phút
 * trả về 1440. Dùng cho mọi phép so trùng giờ, vì giờ đã vòng ("00:00") so
 * sánh ra sai với giờ bắt đầu buổi tối.
 */
export function endMinutesOfDay(startTime: string, durationMinutes: number): number {
  return toMinutesOfDay(startTime) + durationMinutes;
}

export function formatTimeRange(startTime: string, durationMinutes: number): string {
  const total = endMinutesOfDay(startTime, durationMinutes);
  // Kết thúc đúng nửa đêm ghi "24:00" cho dễ đọc với lớp tối muộn; qua nửa đêm
  // thì ghi giờ thật của ngày hôm sau.
  const endStr =
    total === 1440
      ? "24:00"
      : `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  return `${startTime} - ${endStr}`;
}

export function todayISO(): string {
  return toISODate(now());
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nowHHMM(): string {
  const d = now();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Add minutes to an "HH:MM" time-of-day string, wrapping past midnight. */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function startOfWeekMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function firstDayOfMonth(): string {
  const d = now();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function lastDayOfMonth(): string {
  const d = now();
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function addDays(d: Date, days: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

/** Next date on/after `from` that falls on `dayOfWeek` (0=CN..6=T7, JS getDay convention). */
export function nextOccurrence(dayOfWeek: number, from: Date = now()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const diff = (dayOfWeek - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Most recent date on/before `from` that falls on `dayOfWeek` — today counts if it matches. */
export function mostRecentOccurrence(dayOfWeek: number, from: Date = now()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() - dayOfWeek + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * Turns whatever the user pasted into the Facebook field into an openable
 * link, or null when the field is blank. Accepts a full URL, a bare
 * "facebook.com/..." / "m.me/..." address, or just a username/handle — the
 * form is used on a phone, so nobody types "https://" by hand.
 */
export function normalizeFacebookUrl(raw: string): string | null {
  const value = raw.trim().replace(/^@/, "");
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  // A Facebook address pasted without the scheme. Matched against the known
  // hosts rather than "has a dot", because handles routinely contain dots
  // (hoa.nguyen.98) and must still be read as usernames.
  if (/^(?:www\.|m\.)?(?:facebook\.com|fb\.com|fb\.me|m\.me|messenger\.com)\//i.test(value)) {
    return `https://${value}`;
  }
  return `https://facebook.com/${encodeURIComponent(value)}`;
}

/**
 * Bỏ dấu và hạ chữ thường, để gõ "tam" vẫn tìm ra "Tâm" và "dung" ra "Dũng".
 * Dùng cho tra cứu và cho việc gom nhóm theo tên, không dùng để hiển thị.
 */
export function foldVietnamese(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"))
    .toLowerCase();
}
