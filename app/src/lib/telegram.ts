import { randomBytes } from "node:crypto";
import { db } from "./db";
import { getSetting, setSetting } from "./queries";
import type { UserRow } from "./types";

/**
 * Bot Telegram nhắc lịch học.
 *
 * Vì sao Telegram mà không phải Zalo: Zalo OA bắt đăng ký doanh nghiệp, duyệt
 * hồ sơ, và chỉ cho nhắn khách trong 48 giờ kể từ lúc khách nhắn trước. Bot
 * Telegram thì tạo trong hai phút bằng @BotFather, nhắn lúc nào cũng được, và
 * không tốn đồng nào.
 *
 * Toàn bộ phần này tắt sạch khi chưa khai TELEGRAM_BOT_TOKEN — không có bộ
 * hẹn giờ nào chạy, không trang nào hỏng.
 */

/**
 * Máy chủ Bot API. Telegram cho phép tự dựng máy chủ Bot API riêng, nên để
 * đổi được bằng biến môi trường; đây cũng là cách chạy kiểm thử mà không cần
 * gọi ra mạng thật.
 */
const API_ROOT = process.env.TELEGRAM_API_ROOT?.trim() || "https://api.telegram.org";
const BOT_USERNAME_KEY = "telegram_bot_username";

export function telegramToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

export function telegramEnabled(): boolean {
  return telegramToken().length > 0;
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/**
 * Gọi một phương thức của Bot API. Trả về null khi hỏng thay vì ném lỗi:
 * mất mạng một lúc không được phép làm sập máy chủ hay chặn một server action.
 */
export async function callTelegram<T>(
  method: string,
  body: Record<string, unknown> = {}
): Promise<TelegramResponse<T> | null> {
  const token = telegramToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_ROOT}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // getUpdates giữ kết nối tối đa 30 giây, nên hạn chờ phải dài hơn thế.
      signal: AbortSignal.timeout(50_000),
    });
    return (await res.json()) as TelegramResponse<T>;
  } catch (e) {
    console.error(`[telegram] gọi ${method} hỏng:`, e);
    return null;
  }
}

/** Telegram dùng HTML rút gọn; ký tự đặc biệt trong tên khách phải thoát. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Nhắn một tin tới một hộp thư. Khách chặn bot thì Telegram trả 403 — lúc đó
 * xoá luôn kết nối, vì giữ lại chỉ tạo ra một hàng lỗi lặp mãi trong log.
 */
export async function sendMessage(chatId: string, text: string): Promise<boolean> {
  const res = await callTelegram<unknown>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
  if (res?.ok) return true;
  if (res && (res.error_code === 403 || res.error_code === 400)) {
    db.prepare("UPDATE users SET telegram_chat_id = NULL WHERE telegram_chat_id = ?").run(chatId);
    console.warn(`[telegram] ngắt kết nối ${chatId}: ${res.description ?? "không gửi được"}`);
  }
  return false;
}

export function chatIdOf(userId: number): string | null {
  const row = db.prepare("SELECT telegram_chat_id FROM users WHERE id = ?").get(userId) as
    | { telegram_chat_id: string | null }
    | undefined;
  return row?.telegram_chat_id ?? null;
}

/**
 * Nhắn cho một người dùng, có chống gửi trùng.
 *
 * `dedupKey` được ghi vào sổ TRƯỚC khi gửi: hai tiến trình cùng chạy thì chỉ
 * một cái ghi được hàng đó, cái còn lại dừng ngay. Gửi hỏng thì xoá hàng vừa
 * ghi để lần nhắc sau còn thử lại được.
 */
export async function sendToUser(
  userId: number,
  text: string,
  dedupKey?: string
): Promise<boolean> {
  const chatId = chatIdOf(userId);
  if (!chatId) return false;

  if (dedupKey) {
    const claimed = db
      .prepare("INSERT OR IGNORE INTO telegram_log (dedup_key, chat_id) VALUES (?, ?)")
      .run(dedupKey, chatId);
    if (claimed.changes === 0) return false;

    const sent = await sendMessage(chatId, text);
    if (!sent) db.prepare("DELETE FROM telegram_log WHERE dedup_key = ?").run(dedupKey);
    return sent;
  }

  return sendMessage(chatId, text);
}

/**
 * Cầu nối từ thông báo trong web sang Telegram — gọi từ `notifyUser`.
 *
 * Cố ý không await: người bấm nút không phải chờ Telegram trả lời, và mạng
 * Telegram hỏng cũng không được làm hỏng thao tác đang lưu vào cơ sở dữ liệu.
 */
export function pushNotification(userId: number, message: string) {
  if (!telegramEnabled()) return;
  void sendToUser(userId, `🔔 ${escapeHtml(message)}`).catch((e) =>
    console.error("[telegram] đẩy thông báo hỏng:", e)
  );
}

/* ------------------------------------------------------------------ */
/* Kết nối tài khoản                                                    */
/* ------------------------------------------------------------------ */

/** Mã dễ đọc trên điện thoại: bỏ các ký tự nhìn giống nhau (0/O, 1/I). */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newLinkCode(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

/** Mã kết nối hiện tại của người dùng; chưa có thì sinh một mã mới. */
export function linkCodeFor(userId: number): string {
  const row = db.prepare("SELECT telegram_link_code FROM users WHERE id = ?").get(userId) as
    | { telegram_link_code: string | null }
    | undefined;
  if (row?.telegram_link_code) return row.telegram_link_code;

  const code = newLinkCode();
  db.prepare("UPDATE users SET telegram_link_code = ? WHERE id = ?").run(code, userId);
  return code;
}

/**
 * Nối một hộp thư Telegram vào tài khoản mang mã này.
 *
 * Một hộp thư chỉ thuộc về một tài khoản: nối vào tài khoản mới thì gỡ khỏi
 * tài khoản cũ, nếu không một người sẽ nhận lịch của hai người. Mã được đổi
 * ngay sau khi dùng, nên ảnh chụp màn hình cũ không nối lại được nữa.
 */
export function linkChatToCode(code: string, chatId: string): UserRow | null {
  const clean = code.trim().toUpperCase();
  if (clean.length < 6) return null;

  const user = db
    .prepare("SELECT * FROM users WHERE telegram_link_code = ? AND active = 1")
    .get(clean) as UserRow | undefined;
  if (!user) return null;

  db.transaction(() => {
    db.prepare("UPDATE users SET telegram_chat_id = NULL WHERE telegram_chat_id = ?").run(chatId);
    db.prepare("UPDATE users SET telegram_chat_id = ?, telegram_link_code = ? WHERE id = ?").run(
      chatId,
      newLinkCode(),
      user.id
    );
  })();

  return { ...user, telegram_chat_id: chatId };
}

export function userByChatId(chatId: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE telegram_chat_id = ?").get(chatId) as
    | UserRow
    | undefined;
}

export function unlinkUser(userId: number) {
  db.prepare("UPDATE users SET telegram_chat_id = NULL WHERE id = ?").run(userId);
}

/* ------------------------------------------------------------------ */
/* Thông tin bot                                                        */
/* ------------------------------------------------------------------ */

/**
 * Tên bot (@ten_bot) để dựng link t.me. Hỏi Telegram một lần rồi nhớ lại vào
 * bảng cài đặt — trang kết nối của mỗi học viên không nên phải gọi mạng.
 */
export async function getBotUsername(): Promise<string | null> {
  if (!telegramEnabled()) return null;
  const cached = getSetting(BOT_USERNAME_KEY);
  if (cached) return cached;

  const res = await callTelegram<{ username?: string }>("getMe");
  const username = res?.ok ? res.result?.username : undefined;
  if (!username) return null;
  setSetting(BOT_USERNAME_KEY, username);
  return username;
}

export interface TelegramStatus {
  enabled: boolean;
  botUsername: string | null;
  linkedTotal: number;
  linkedTeachers: number;
  linkedStudents: number;
}

export async function telegramStatus(): Promise<TelegramStatus> {
  const enabled = telegramEnabled();
  const counts = enabled
    ? (db
        .prepare(
          `SELECT
             COUNT(*) AS total,
             SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END) AS teachers,
             SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) AS students
           FROM users WHERE telegram_chat_id IS NOT NULL`
        )
        .get() as { total: number; teachers: number | null; students: number | null })
    : { total: 0, teachers: 0, students: 0 };

  return {
    enabled,
    botUsername: enabled ? await getBotUsername() : null,
    linkedTotal: counts.total,
    linkedTeachers: counts.teachers ?? 0,
    linkedStudents: counts.students ?? 0,
  };
}

/** Dọn sổ chống trùng: giữ 60 ngày là thừa sức cho mọi lời nhắc đang chờ. */
export function pruneTelegramLog() {
  db.prepare("DELETE FROM telegram_log WHERE sent_at < datetime('now', '-60 days')").run();
}
