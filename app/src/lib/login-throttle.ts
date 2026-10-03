import { headers } from "next/headers";

/**
 * Chặn dò mật khẩu: gõ sai liên tục thì khóa tạm.
 *
 * Mật khẩu tối thiểu chỉ 6 ký tự, nên không giới hạn thì một máy có thể thử
 * hàng nghìn lần mỗi phút. Đếm theo hai thứ:
 *  - tên đăng nhập: sai 5 lần thì tài khoản đó khóa 15 phút;
 *  - địa chỉ IP: sai 20 lần (dò nhiều tài khoản) thì máy đó khóa 15 phút.
 *
 * Lưu trong bộ nhớ là đủ — server chạy một tiến trình, khởi động lại thì xóa
 * sạch cũng không sao.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_LOGIN = 5;
const MAX_PER_IP = 20;

interface Bucket {
  fails: number;
  firstAt: number;
}

const buckets = new Map<string, Bucket>();

function liveBucket(key: string, now: number): Bucket | undefined {
  const b = buckets.get(key);
  if (b && now - b.firstAt > WINDOW_MS) {
    buckets.delete(key);
    return undefined;
  }
  return b;
}

async function keysFor(login: string): Promise<{ key: string; max: number }[]> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim();
  const keys = [{ key: `u:${login.trim().toLowerCase()}`, max: MAX_PER_LOGIN }];
  if (ip) keys.push({ key: `ip:${ip}`, max: MAX_PER_IP });
  return keys;
}

/** Số phút còn bị khóa, hoặc 0 nếu được thử. */
export async function loginLockedMinutes(login: string): Promise<number> {
  const now = Date.now();
  let waitMs = 0;
  for (const { key, max } of await keysFor(login)) {
    const b = liveBucket(key, now);
    if (b && b.fails >= max) waitMs = Math.max(waitMs, b.firstAt + WINDOW_MS - now);
  }
  return Math.ceil(waitMs / 60000);
}

export async function recordLoginFailure(login: string) {
  const now = Date.now();
  for (const { key } of await keysFor(login)) {
    const b = liveBucket(key, now);
    if (b) b.fails += 1;
    else buckets.set(key, { fails: 1, firstAt: now });
  }
  // Dọn bớt cho map khỏi phình mãi.
  if (buckets.size > 5000) {
    for (const [key] of buckets) liveBucket(key, now);
  }
}

/** Đăng nhập đúng thì xóa đếm của tên đăng nhập đó (IP giữ nguyên). */
export function clearLoginFailures(login: string) {
  buckets.delete(`u:${login.trim().toLowerCase()}`);
}
