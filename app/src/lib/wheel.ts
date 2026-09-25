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
