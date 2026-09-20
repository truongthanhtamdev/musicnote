/**
 * Google Analytics 4.
 *
 * Chỉ đo TRANG CÔNG KHAI. Trang quản trị, trang giáo viên và trang học viên
 * không gửi gì lên GA: người vào những trang đó là nhân sự trung tâm, đếm
 * chung vào sẽ làm sai con số "bao nhiêu khách lạ ghé web" — mà đó mới là
 * con số cần biết. Không có sự kiện nào gửi đi thì GA cũng không ghi nhận
 * phiên nào, nên nhân sự hoàn toàn không xuất hiện trong báo cáo.
 *
 * Mã đo nằm ở biến môi trường NEXT_PUBLIC_GA_ID. Chưa khai thì toàn bộ phần
 * GA không được render — web chạy y hệt như trước, không tải thêm gì.
 */

// Chỉ nhận đúng dạng mã GA4 (G-XXXXXXX). Khai sai dạng thì coi như chưa khai,
// vì chuỗi này được nhúng thẳng vào thẻ <script> của trang.
const RAW_GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() ?? "";
export const GA_MEASUREMENT_ID = /^G-[A-Z0-9]{4,24}$/i.test(RAW_GA_ID) ? RAW_GA_ID : "";

/** Nhánh đường dẫn của người đã đăng nhập — không đo. */
const PRIVATE_PREFIXES = [
  "/admin",
  "/teacher",
  "/student",
  "/account",
  "/login",
  "/quen-mat-khau",
  "/danh-gia",
];

export function isPublicPath(pathname: string): boolean {
  return !PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Gửi một sự kiện chuyển đổi (khách đăng ký học thử, khách bấm nút Zalo...).
 * Gọi được ở bất kỳ component client nào; chưa bật GA thì tự bỏ qua.
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}
