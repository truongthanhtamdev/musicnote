import jwt from "jsonwebtoken";

/**
 * Phần chữ ký của phiên đăng nhập, tách riêng khỏi auth.ts.
 *
 * Tách ra vì proxy.ts cần dùng, mà auth.ts thì kéo theo cả better-sqlite3 —
 * nạp cả tầng dữ liệu vào lớp chạy trước mọi request là vừa nặng vừa thừa.
 */

const SECRET = process.env.AUTH_SECRET || "musicnote-dev-secret-change-me";

export const COOKIE_NAME = "musicnote_session";

/** Không dùng bao nhiêu ngày thì phải đăng nhập lại. */
export const SESSION_DAYS = 30;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;

export interface SessionPayload {
  userId: number;
  role: "admin" | "manager" | "coordinator" | "teacher" | "student";
  name: string;
}

/** Payload đọc từ token, kèm mốc hết hạn để biết khi nào cần gia hạn. */
export interface VerifiedSession extends SessionPayload {
  exp: number;
}

export function signSession(payload: SessionPayload): string {
  // Chỉ ký đúng ba trường; nhận cả iat/exp cũ vào đây là jsonwebtoken báo lỗi.
  const { userId, role, name } = payload;
  return jwt.sign({ userId, role, name }, SECRET, { expiresIn: SESSION_SECONDS });
}

export function verifySession(token: string): VerifiedSession | null {
  try {
    return jwt.verify(token, SECRET) as VerifiedSession;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}

/**
 * Đã dùng quá nửa chặng thì gia hạn.
 *
 * Không gia hạn mỗi request để khỏi kèm Set-Cookie vào mọi lần tải trang,
 * nhưng vẫn đảm bảo người dùng đều đặn thì phiên không bao giờ hết hạn —
 * đó chính là lý do trước đây ai dùng liên tục vẫn bị đá ra ở ngày thứ 30.
 */
export function shouldRenew(session: VerifiedSession): boolean {
  const remainingMs = session.exp * 1000 - Date.now();
  return remainingMs < (SESSION_SECONDS * 1000) / 2;
}
