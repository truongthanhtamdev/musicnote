import jwt from "jsonwebtoken";

/**
 * Vòng quay may mắn tặng buổi học thử.
 *
 * Kết quả do MÁY CHỦ quyết định và ký, không phải trình duyệt. Nếu để trình
 * duyệt tự random thì khách chỉ cần tải lại trang và quay tới khi ra 5 buổi —
 * phần thưởng mất hết ý nghĩa, mà trung tâm vẫn phải trả.
 *
 * Phần thưởng đã quay được cất trong cookie httpOnly: JavaScript của trang
 * không đọc hay sửa được, và lúc khách gửi form thì máy chủ đọc lại chính
 * cookie đó để ghi vào đăng ký — nên số hiện trên vòng quay luôn khớp số
 * trung tâm nhận.
 */

const SECRET = process.env.AUTH_SECRET || "musicnote-dev-secret-change-me";

export const WHEEL_COOKIE = "musicnote_wheel";

/** Cookie sống 7 ngày: khách xem rồi vài hôm sau quay lại đăng ký vẫn còn thưởng. */
export const WHEEL_COOKIE_DAYS = 7;

/**
 * Các ô trên vòng quay, theo chiều kim đồng hồ từ 12 giờ.
 *
 * Tỉ lệ trúng chính là số ô: 1 buổi có 3 ô, 2 buổi có 2 ô, còn 3/4/5 buổi mỗi
 * loại một ô. Trung bình mỗi lượt quay tặng 2,4 buổi. Cố ý lệch về số nhỏ —
 * chia đều 1..5 thì trung bình 3 buổi, gấp ba lần mức học thử bình thường.
 *
 * Muốn đổi tỉ lệ thì sửa đúng mảng này, phần còn lại tự theo.
 */
export const WHEEL_SEGMENTS = [1, 2, 1, 3, 1, 2, 4, 5] as const;

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

export function signPrize(prize: WheelPrize): string {
  return jwt.sign(prize, SECRET, { expiresIn: `${WHEEL_COOKIE_DAYS}d` });
}

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
