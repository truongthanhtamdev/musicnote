import { cookies } from "next/headers";
import { db } from "./db";
import {
  COOKIE_NAME,
  sessionCookieOptions,
  signSession,
  verifySession,
  type SessionPayload,
} from "./session-token";
import type { UserRow } from "./types";

export { signSession, verifySession };
export type { SessionPayload };

/**
 * Phiên đăng nhập hiện tại — chữ ký đúng CHƯA đủ, tài khoản còn phải hợp lệ.
 *
 * Phiên là token tự ký, có sẵn 30 ngày và tự gia hạn khi dùng đều. Nếu chỉ
 * kiểm chữ ký thì giáo viên đã bị "Ngừng hoạt động" hay vừa bị đặt lại mật
 * khẩu vẫn dùng tiếp trên máy đang đăng nhập — vẫn xem học viên, vẫn tự điểm
 * danh (tức là tự tính lương). Nên mỗi lần đọc phiên đều đối chiếu với bảng
 * users: còn tồn tại, còn hoạt động, và mật khẩu chưa bị đổi kể từ lúc đăng
 * nhập. Vai trò và tên lấy theo bảng users để đổi vai trò có hiệu lực ngay.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifySession(token);
  if (!session) return null;

  const user = db
    .prepare("SELECT role, name, active, session_version FROM users WHERE id = ?")
    .get(session.userId) as
    | Pick<UserRow, "role" | "name" | "active"> & { session_version: number }
    | undefined;
  if (!user || !user.active) return null;
  if ((session.v ?? 0) !== user.session_version) return null;

  return { userId: session.userId, role: user.role, name: user.name, v: user.session_version };
}

/** Ghi phiên cho tài khoản này, kèm số phiên hiện tại của nó. */
export async function setSessionCookie(user: Pick<UserRow, "id" | "role" | "name">) {
  const row = db.prepare("SELECT session_version FROM users WHERE id = ?").get(user.id) as
    | { session_version: number }
    | undefined;
  const store = await cookies();
  store.set(
    COOKIE_NAME,
    signSession({ userId: user.id, role: user.role, name: user.name, v: row?.session_version ?? 0 }),
    sessionCookieOptions()
  );
}

/**
 * Đẩy mọi máy đang đăng nhập tài khoản này ra — gọi khi mật khẩu đổi.
 */
export function revokeSessions(userId: number) {
  db.prepare("UPDATE users SET session_version = session_version + 1 WHERE id = ?").run(userId);
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function getUserById(id: number): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function getUserByEmail(email: string): UserRow | undefined {
  return db
    .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
    .get(email) as UserRow | undefined;
}

/**
 * Các tài khoản có thể ứng với thứ người dùng gõ vào ô đăng nhập: email, số
 * điện thoại, hoặc MÃ LỚP.
 *
 * Cho phép mã lớp vì giáo vụ quản lý khách theo mã trong file Excel — đọc mã
 * cho khách dễ hơn là dò lại số điện thoại. Mã lớp chỉ dẫn tới tài khoản của
 * khách đã được gắn vào lớp đó, nên một khách có hai bé vẫn chỉ một tài
 * khoản, gõ mã nào cũng vào đúng chỗ.
 */
export function findLoginCandidates(identifier: string): UserRow[] {
  const found: UserRow[] = [];
  const add = (u: UserRow | undefined) => {
    if (u && !found.some((f) => f.id === u.id)) found.push(u);
  };

  add(getUserByEmail(identifier));
  add(
    db
      .prepare(
        `SELECT u.* FROM classes c
           JOIN users u ON u.id = c.student_user_id
          WHERE c.code = ? COLLATE NOCASE AND u.role = 'student'
          LIMIT 1`
      )
      .get(identifier) as UserRow | undefined
  );

  // Giáo viên / nhân sự gõ SỐ ĐIỆN THOẠI thay vì email. Tài khoản học viên
  // vốn lấy SĐT làm tên đăng nhập nên đã khớp ở trên. Một SĐT có thể vừa là
  // tài khoản học viên vừa là của giáo viên — trả cả hai, mật khẩu đúng cái
  // nào thì vào cái đó.
  const phone = phoneKey(identifier);
  if (phone) {
    const staff = db
      .prepare("SELECT * FROM users WHERE role != 'student' AND phone IS NOT NULL AND phone != ''")
      .all() as UserRow[];
    for (const u of staff) if (phoneKey(u.phone ?? "") === phone) add(u);
  }
  return found;
}

/** 9 số cuối của một SĐT — để 0912…, +84912…, 0912 345 678 đều ra cùng một khóa. */
function phoneKey(raw: string): string {
  const cleaned = raw.replace(/[\s.()-]/g, "");
  if (!/^\+?\d{8,15}$/.test(cleaned)) return "";
  return cleaned.replace(/\D/g, "").slice(-9);
}

export const COOKIE = COOKIE_NAME;
