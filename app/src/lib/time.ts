/**
 * Toàn hệ thống làm việc theo giờ Việt Nam, kể cả khi máy chủ đặt múi giờ
 * UTC — nếu không, sau 17h chiều VN hệ thống đã nhảy sang "ngày mai" và
 * lịch hẹn trong ngày biến mất khỏi màn hình.
 */
export const VN_TZ = "Asia/Ho_Chi_Minh";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: VN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: VN_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Hôm nay theo giờ VN, dạng YYYY-MM-DD. */
export function vnToday(now: Date = new Date()): string {
  return dateFmt.format(now);
}

/** Giờ hiện tại theo giờ VN, dạng HH:MM. */
export function vnNowHHMM(now: Date = new Date()): string {
  return timeFmt.format(now);
}

/** Mốc hiện tại dạng "YYYY-MM-DD HH:MM" để so sánh trực tiếp với starts_at. */
export function vnNowStamp(now: Date = new Date()): string {
  return `${vnToday(now)} ${vnNowHHMM(now)}`;
}

/** Số phút từ 00:00 của "HH:MM". */
export function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Cộng phút vào mốc "YYYY-MM-DD HH:MM", trả lại cùng định dạng. */
export function addMinutesToStamp(stamp: string, minutes: number): string {
  const [datePart, timePart = "00:00"] = stamp.split(" ");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  // Dùng UTC để cộng trừ cho khỏi dính chuyện đổi giờ của máy chủ; các con số
  // vào và ra đều đã là giờ Việt Nam.
  const t = Date.UTC(y, mo - 1, d, h, mi) + minutes * 60_000;
  const x = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${x.getUTCFullYear()}-${p(x.getUTCMonth() + 1)}-${p(x.getUTCDate())} ${p(x.getUTCHours())}:${p(x.getUTCMinutes())}`;
}

/** "2026-09-16 19:00" → "19:00". */
export function stampTime(stamp: string): string {
  return stamp.split(" ")[1]?.slice(0, 5) ?? "";
}

/** "2026-09-16 19:00" → "2026-09-16". */
export function stampDate(stamp: string): string {
  return stamp.split(" ")[0];
}

/** "2026-09-16" → "16/09". */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

const WEEKDAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

/** "Thứ năm, 16/09/2026" — dùng cho tiêu đề trang và tin nhắn Telegram. */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[dow]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

/** Khoảng cách tới mốc hẹn, đọc được: "còn 25 phút", "quá 10 phút". */
export function relativeToNow(stamp: string, now: Date = new Date()): string {
  const diff = stampToMinutes(stamp) - stampToMinutes(vnNowStamp(now));
  const abs = Math.abs(diff);
  const text =
    abs < 60
      ? `${abs} phút`
      : abs < 1440
        ? `${Math.floor(abs / 60)} tiếng${abs % 60 ? ` ${abs % 60} phút` : ""}`
        : `${Math.floor(abs / 1440)} ngày`;
  if (diff === 0) return "ngay bây giờ";
  return diff > 0 ? `còn ${text}` : `quá ${text}`;
}

function stampToMinutes(stamp: string): number {
  const [datePart, timePart = "00:00"] = stamp.split(" ");
  const [y, mo, d] = datePart.split("-").map(Number);
  return Math.floor(Date.UTC(y, mo - 1, d) / 60_000) + minutesOfDay(timePart);
}
