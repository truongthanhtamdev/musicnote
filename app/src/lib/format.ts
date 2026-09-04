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

export function formatTimeRange(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const end = new Date(2000, 0, 1, h, m + durationMinutes);
  const endStr = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
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
