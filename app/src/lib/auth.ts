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

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(payload: SessionPayload) {
  const store = await cookies();
  store.set(COOKIE_NAME, signSession(payload), sessionCookieOptions());
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
 * Tìm tài khoản theo thứ gì người dùng gõ vào ô đăng nhập: email, số điện
 * thoại, hoặc MÃ LỚP.
 *
 * Cho phép mã lớp vì giáo vụ quản lý khách theo mã trong file Excel — đọc mã
 * cho khách dễ hơn là dò lại số điện thoại. Mã lớp chỉ dẫn tới tài khoản của
 * khách đã được gắn vào lớp đó, nên một khách có hai bé vẫn chỉ một tài
 * khoản, gõ mã nào cũng vào đúng chỗ.
 */
export function findLoginUser(identifier: string): UserRow | undefined {
  const direct = getUserByEmail(identifier);
  if (direct) return direct;

  return db
    .prepare(
      `SELECT u.* FROM classes c
         JOIN users u ON u.id = c.student_user_id
        WHERE c.code = ? COLLATE NOCASE AND u.role = 'student'
        LIMIT 1`
    )
    .get(identifier) as UserRow | undefined;
}

export const COOKIE = COOKIE_NAME;
