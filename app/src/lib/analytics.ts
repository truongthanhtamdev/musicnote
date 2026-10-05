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

/**
 * Mã đo của trung tâm, để sẵn trong mã nguồn thay vì bắt khai trên máy chủ.
 *
 * Mã này không phải bí mật — nó nằm trong mã nguồn trang web mà ai bấm "xem
 * nguồn" cũng đọc được. Trong khi đó NEXT_PUBLIC_ lại được nhúng vào lúc
 * build, nên quên khai là build ra một bản web không đo được gì mà chẳng có
 * lỗi nào báo. Để sẵn thì chỉ cần build là chạy.
 *
 * Khai NEXT_PUBLIC_GA_ID để trỏ sang property khác, hoặc khai rỗng để tắt.
 */
const DEFAULT_GA_ID = "G-094RV6EL7C";

// Chỉ nhận đúng dạng mã GA4 (G-XXXXXXX). Khai sai dạng thì coi như chưa khai,
// vì chuỗi này được nhúng thẳng vào thẻ <script> của trang.
const RAW_GA_ID = (process.env.NEXT_PUBLIC_GA_ID ?? DEFAULT_GA_ID).trim();

/**
 * Máy đang chạy `next dev` thì không đo: lượt xem lúc lập trình mà lẫn vào
 * báo cáo là số liệu hỏng, và đó chính là bẫy của việc để sẵn mã trong code.
 */
export const GA_MEASUREMENT_ID =
  process.env.NODE_ENV !== "development" && /^G-[A-Z0-9]{4,24}$/i.test(RAW_GA_ID)
    ? RAW_GA_ID
    : "";

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
    /** Pixel quảng cáo OpenAI — chỉ có trên trang công khai (xem oai-pixel.tsx). */
    oaiq?: (...args: unknown[]) => void;
    /** Meta Pixel (Facebook) — chỉ có trên trang công khai (xem meta-pixel.tsx). */
    fbq?: (...args: unknown[]) => void;
  }
}

/** Nút liên hệ trung tâm → sự kiện chuẩn "Contact" của Meta. */
const META_CONTACT_EVENTS = new Set(["nhan_messenger", "nhan_zalo", "ket_ban_facebook"]);

/**
 * Báo cho các pixel quảng cáo biết khách vừa đăng ký học thử:
 *  - OpenAI: lệnh lấy nguyên văn từ Ads Manager (Appointment Scheduled);
 *  - Meta: sự kiện chuẩn "Lead" — chọn làm chuyển đổi khi chạy quảng cáo
 *    Facebook để tối ưu ra người đăng ký, không chỉ người bấm xem.
 * Không có pixel (trang nội bộ, máy lập trình) thì tự bỏ qua.
 */
export function trackAppointmentScheduled() {
  if (typeof window === "undefined") return;
  window.oaiq?.("measure", "appointment_scheduled", { type: "customer_action" });
  window.fbq?.("track", "Lead", { content_name: "Đăng ký học thử" });
}

/**
 * Gửi một sự kiện chuyển đổi (khách đăng ký học thử, khách bấm nút Zalo...).
 * Gọi được ở bất kỳ component client nào; chưa bật GA thì tự bỏ qua.
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
  if (META_CONTACT_EVENTS.has(name)) window.fbq?.("track", "Contact", { content_name: name });
}
