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

/**
 * Hai bot:
 *   • "main"  (TELEGRAM_BOT_TOKEN) — bot nhắc lịch cho giáo viên + học viên.
 *   • "staff" (TELEGRAM_STAFF_BOT_TOKEN, không bắt buộc) — bot riêng cho chủ
 *     trung tâm, quản lý, giáo vụ: khách mới, học thử, lớp chưa có giáo viên.
 * Chưa khai bot staff thì mọi người dùng chung bot main như trước.
 */
export type BotKind = "main" | "staff";

const STAFF_ROLES = ["admin", "manager", "coordinator"];

/** Cột lưu hộp thư của mỗi người với từng bot — mỗi bot là một cuộc trò chuyện riêng. */
const CHAT_COLUMN: Record<BotKind, "telegram_chat_id" | "telegram_staff_chat_id"> = {
  main: "telegram_chat_id",
  staff: "telegram_staff_chat_id",
};

function tokenOf(bot: BotKind): string {
  return (bot === "staff" ? process.env.TELEGRAM_STAFF_BOT_TOKEN : process.env.TELEGRAM_BOT_TOKEN)?.trim() ?? "";
}

export function telegramToken(): string {
  return tokenOf("main");
}

export function botEnabled(bot: BotKind): boolean {
  return tokenOf(bot).length > 0;
}

/** Có ít nhất một bot đang bật. */
export function telegramEnabled(): boolean {
  return botEnabled("main") || botEnabled("staff");
}

export function enabledBots(): BotKind[] {
  return (["main", "staff"] as const).filter(botEnabled);
}

/** Bot mà một người nhận tin: quản lý / giáo vụ dùng bot staff nếu đã bật. */
export function botForRole(role: string): BotKind {
  return STAFF_ROLES.includes(role) && botEnabled("staff") ? "staff" : "main";
}

/** Điều kiện SQL "nhân sự quản lý đã nối Telegram" — theo đúng bot họ nhận tin. */
export function staffLinkedSql(): string {
  return `${CHAT_COLUMN[botEnabled("staff") ? "staff" : "main"]} IS NOT NULL`;
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
  body: Record<string, unknown> = {},
  bot: BotKind = "main"
): Promise<TelegramResponse<T> | null> {
  const token = tokenOf(bot);
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
    // In kèm nguyên nhân gốc (ENETUNREACH, ETIMEDOUT...) — "fetch failed" trơn thì không biết hỏng ở đâu.
    const cause = (e as { cause?: { code?: string; message?: string } })?.cause;
    console.error(`[telegram] gọi ${method} hỏng:`, cause?.code ?? cause?.message ?? e);
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
export async function sendMessage(chatId: string, text: string, bot: BotKind = "main"): Promise<boolean> {
  const res = await callTelegram<unknown>(
    "sendMessage",
    {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    },
    bot
  );
  if (res?.ok) return true;
  if (res && (res.error_code === 403 || res.error_code === 400)) {
    const col = CHAT_COLUMN[bot];
    db.prepare(`UPDATE users SET ${col} = NULL WHERE ${col} = ?`).run(chatId);
    console.warn(`[telegram] ngắt kết nối ${chatId}: ${res.description ?? "không gửi được"}`);
  }
  return false;
}

/** Hộp thư của một người trên đúng bot họ nhận tin. */
export function chatIdOf(userId: number): { chatId: string; bot: BotKind } | null {
  const row = db
    .prepare("SELECT role, telegram_chat_id, telegram_staff_chat_id FROM users WHERE id = ?")
    .get(userId) as { role: string; telegram_chat_id: string | null; telegram_staff_chat_id: string | null } | undefined;
  if (!row) return null;
  const bot = botForRole(row.role);
  const chatId = row[CHAT_COLUMN[bot]];
  return chatId ? { chatId, bot } : null;
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
  const target = chatIdOf(userId);
  if (!target) return false;
  const { chatId, bot } = target;

  if (dedupKey) {
    const claimed = db
      .prepare("INSERT OR IGNORE INTO telegram_log (dedup_key, chat_id) VALUES (?, ?)")
      .run(dedupKey, chatId);
    if (claimed.changes === 0) return false;

    const sent = await sendMessage(chatId, text, bot);
    if (!sent) db.prepare("DELETE FROM telegram_log WHERE dedup_key = ?").run(dedupKey);
    return sent;
  }

  return sendMessage(chatId, text, bot);
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

/**
 * Khách mới đăng ký học thử trên web: báo ngay cho chủ trung tâm, quản lý và
 * giáo vụ đã nối Telegram, để gọi lại khi khách còn "nóng". Không await —
 * khách bấm gửi form không phải chờ Telegram.
 */
export function notifyNewCustomer(c: {
  requestId: number;
  name: string;
  phone: string;
  subject: string;
  contact?: string | null;
  note?: string | null;
  email?: string | null;
  existingStudent?: boolean;
}) {
  if (!telegramEnabled()) return;
  const staff = db
    .prepare(
      `SELECT id FROM users WHERE role IN ('admin','manager','coordinator') AND active = 1 AND ${staffLinkedSql()}`
    )
    .all() as { id: number }[];
  if (staff.length === 0) return;
  const site = process.env.SITE_URL || "https://pianoguitardemhat.com";
  const text =
    `🔔 <b>${c.existingStudent ? "Học viên đăng ký học thêm môn" : "Khách mới đăng ký học thử"}</b>\n` +
    `👤 ${escapeHtml(c.name)}\n` +
    `📞 ${escapeHtml(c.phone)}\n` +
    `🎵 ${escapeHtml(c.subject)}` +
    (c.contact ? `\n💬 ${escapeHtml(c.contact)}` : "") +
    (c.email ? `\n✉️ ${escapeHtml(c.email)}` : "") +
    (c.note ? `\n📝 ${escapeHtml(c.note)}` : "") +
    `\n\n👉 <a href="${site}/admin/trial-requests">Mở danh sách đăng ký học thử</a>`;
  for (const { id } of staff) {
    void sendToUser(id, text, `khach-moi|${c.requestId}|${id}`).catch((e) =>
      console.error("[telegram] báo khách mới hỏng:", e)
    );
  }
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
export function linkChatToCode(
  code: string,
  chatId: string,
  bot: BotKind = "main"
): UserRow | { wrongBot: BotKind } | null {
  const clean = code.trim().toUpperCase();
  if (clean.length < 6) return null;

  const user = db
    .prepare("SELECT * FROM users WHERE telegram_link_code = ? AND active = 1")
    .get(clean) as UserRow | undefined;
  if (!user) return null;
  // Gửi mã nhầm bot (giáo viên gửi cho bot quản lý hay ngược lại): không nối,
  // vì tin của họ sẽ đi qua bot kia và người đó sẽ không nhận được gì. Giữ
  // nguyên mã để họ gửi lại đúng bot.
  if (botForRole(user.role) !== bot) return { wrongBot: botForRole(user.role) };

  const col = CHAT_COLUMN[bot];
  db.transaction(() => {
    db.prepare(`UPDATE users SET ${col} = NULL WHERE ${col} = ?`).run(chatId);
    db.prepare(`UPDATE users SET ${col} = ?, telegram_link_code = ? WHERE id = ?`).run(chatId, newLinkCode(), user.id);
  })();

  return user;
}

export function userByChatId(chatId: string, bot: BotKind = "main"): UserRow | undefined {
  return db.prepare(`SELECT * FROM users WHERE ${CHAT_COLUMN[bot]} = ?`).get(chatId) as UserRow | undefined;
}

/** Người này đã nối Telegram trên đúng bot của họ chưa. */
export function isLinked(userId: number): boolean {
  return chatIdOf(userId) !== null;
}

export function unlinkUser(userId: number) {
  db.prepare("UPDATE users SET telegram_chat_id = NULL, telegram_staff_chat_id = NULL WHERE id = ?").run(userId);
}

/* ------------------------------------------------------------------ */
/* Thông tin bot                                                        */
/* ------------------------------------------------------------------ */

/**
 * Tên bot (@ten_bot) để dựng link t.me. Hỏi Telegram một lần rồi nhớ lại vào
 * bảng cài đặt — trang kết nối của mỗi học viên không nên phải gọi mạng.
 */
export async function getBotUsername(bot: BotKind = "main"): Promise<string | null> {
  if (!botEnabled(bot)) return null;
  // Nhớ theo mã số bot (phần trước dấu ":" của token): đổi token sang bot
  // khác thì tự hỏi lại tên, không dẫn người dùng tới bot cũ.
  const key = `${BOT_USERNAME_KEY}:${tokenOf(bot).split(":")[0]}`;
  const cached = getSetting(key);
  if (cached) return cached;

  const res = await callTelegram<{ username?: string }>("getMe", {}, bot);
  const username = res?.ok ? res.result?.username : undefined;
  if (!username) return null;
  setSetting(key, username);
  return username;
}

export interface TelegramStatus {
  enabled: boolean;
  botUsername: string | null;
  /** Bot riêng cho quản lý / giáo vụ, nếu đã khai TELEGRAM_STAFF_BOT_TOKEN. */
  staffBotUsername: string | null;
  linkedTotal: number;
  linkedTeachers: number;
  linkedStudents: number;
  linkedStaff: number;
}

export async function telegramStatus(): Promise<TelegramStatus> {
  const enabled = telegramEnabled();
  const counts = enabled
    ? (db
        .prepare(
          `SELECT
             SUM(CASE WHEN telegram_chat_id IS NOT NULL OR telegram_staff_chat_id IS NOT NULL THEN 1 ELSE 0 END) AS total,
             SUM(CASE WHEN role = 'teacher' AND telegram_chat_id IS NOT NULL THEN 1 ELSE 0 END) AS teachers,
             SUM(CASE WHEN role = 'student' AND telegram_chat_id IS NOT NULL THEN 1 ELSE 0 END) AS students,
             SUM(CASE WHEN role IN ('admin','manager','coordinator') AND ${staffLinkedSql()} THEN 1 ELSE 0 END) AS staff
           FROM users`
        )
        .get() as { total: number | null; teachers: number | null; students: number | null; staff: number | null })
    : { total: 0, teachers: 0, students: 0, staff: 0 };

  return {
    enabled,
    botUsername: await getBotUsername("main"),
    staffBotUsername: await getBotUsername("staff"),
    linkedTotal: counts.total ?? 0,
    linkedTeachers: counts.teachers ?? 0,
    linkedStudents: counts.students ?? 0,
    linkedStaff: counts.staff ?? 0,
  };
}

/** Dọn sổ chống trùng: giữ 60 ngày là thừa sức cho mọi lời nhắc đang chờ. */
export function pruneTelegramLog() {
  db.prepare("DELETE FROM telegram_log WHERE sent_at < datetime('now', '-60 days')").run();
}
