import jwt from "jsonwebtoken";

/**
 * Vòng quay may mắn tặng buổi học thử.
 *
 * Khách phải GỬI ĐĂNG KÝ TRƯỚC rồi mới được quay: trung tâm có số điện thoại
 * trước đã, và kết quả quay ghi thẳng vào đúng đăng ký đó (xem wheel-state.ts).
 *
 * Kết quả do MÁY CHỦ quyết định, không phải trình duyệt. Nếu để trình duyệt tự
 * random thì khách chỉ cần tải lại trang và quay tới khi ra 3 buổi — phần
 * thưởng mất hết ý nghĩa, mà trung tâm vẫn phải trả.
 */

const SECRET = process.env.AUTH_SECRET || "musicnote-dev-secret-change-me";

/** Cookie kiểu cũ: quay trước, gửi form sau. Chỉ còn đọc để khách đã quay trước khi đổi luật không mất thưởng. */
export const WHEEL_COOKIE = "musicnote_wheel";

/** Cookie ghi đăng ký học thử vừa gửi từ máy này — mở khoá vòng quay cho đúng đăng ký đó. */
export const WHEEL_REQUEST_COOKIE = "musicnote_wheel_req";

/** Cookie sống 7 ngày: khách xem rồi vài hôm sau quay lại đăng ký vẫn còn thưởng. */
export const WHEEL_COOKIE_DAYS = 7;

/**
 * Các ô trên vòng quay, theo chiều kim đồng hồ từ 12 giờ.
 *
 * Tỉ lệ trúng CHÍNH LÀ số ô, không có bảng xác suất nào riêng: 2 buổi có 4 ô
 * (50%), 1 buổi có 3 ô (37,5%), 3 buổi có 1 ô (12,5%). Trung bình mỗi lượt
 * quay tặng 1,75 buổi.
 *
 * Xếp xen kẽ để ô "2 buổi" rải đều quanh vòng, nhìn không bị dồn một cụm.
 *
 * Muốn đổi tỉ lệ thì sửa đúng mảng này, hình vẽ và xác suất tự theo.
 */
export const WHEEL_SEGMENTS = [2, 1, 2, 3, 2, 1, 2, 1] as const;

/** Số buổi học thử mặc định khi khách không quay. */
export const DEFAULT_TRIAL_SESSIONS = 1;

export interface WheelPrize {
  /** Ô nào trên vòng quay — để hoạt ảnh dừng đúng chỗ. */
  index: number;
  /** Số buổi học thử trúng được. */
  sessions: number;
}

export function spinWheel(): WheelPrize {
  const index = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
  return { index, sessions: WHEEL_SEGMENTS[index] };
}

/** Một ô bất kỳ có đúng số buổi này — để vòng quay dừng đúng chỗ khi hiện lại kết quả cũ. */
export function segmentIndexFor(sessions: number): number {
  const matches = WHEEL_SEGMENTS.flatMap((s, i) => (s === sessions ? [i] : []));
  return matches.length ? matches[Math.floor(Math.random() * matches.length)] : 0;
}

export function signRequest(requestId: number): string {
  return jwt.sign({ rid: requestId }, SECRET, { expiresIn: `${WHEEL_COOKIE_DAYS}d` });
}

export function readRequest(token: string | undefined): number | null {
  if (!token) return null;
  try {
    const id = Number((jwt.verify(token, SECRET) as { rid?: unknown }).rid);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export const wheelCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
  maxAge: WHEEL_COOKIE_DAYS * 24 * 60 * 60,
};

/**
 * Đọc phần thưởng từ cookie. Trả null khi chưa quay, cookie hỏng, hoặc ai đó
 * tự chế cookie — lúc đó khách nhận mức học thử bình thường chứ không phải
 * con số họ tự điền vào.
 */
export function readPrize(token: string | undefined): WheelPrize | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SECRET) as Partial<WheelPrize>;
    const index = Number(decoded.index);
    // Chỉ tin số ô, rồi TRA LẠI bảng để lấy số buổi: kể cả có ai ký được
    // token giả thì cũng không đặt được số buổi ngoài danh sách trên vòng quay.
    if (!Number.isInteger(index) || index < 0 || index >= WHEEL_SEGMENTS.length) return null;
    return { index, sessions: WHEEL_SEGMENTS[index] };
  } catch {
    return null;
  }
}
