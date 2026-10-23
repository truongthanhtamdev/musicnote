import { addDays, formatTimeRange, now, toISODate } from "./format";
import { getSetting, listClasses, listSessionsOn, setSetting } from "./queries";
import {
  type BotKind,
  callTelegram,
  enabledBots,
  escapeHtml,
  getBotUsername,
  linkChatToCode,
  sendMessage,
  unlinkUser,
  userByChatId,
} from "./telegram";
import { isTrialSession } from "./telegram-reminders";
import { DAY_LABELS, type UserRow } from "./types";

/**
 * Bot nhận lệnh từ người dùng.
 *
 * Dùng kiểu "hỏi liên tục" (getUpdates) chứ không dùng webhook: webhook bắt
 * phải khai báo địa chỉ web công khai với Telegram và phải khai lại mỗi lần
 * đổi tên miền hay chứng chỉ. Kiểu này thì cài token xong là chạy, không phải
 * làm thêm bước nào trên máy chủ.
 *
 * Đánh đổi: chỉ được chạy MỘT tiến trình. Hai tiến trình cùng hỏi sẽ giành
 * mất tin của nhau. Trung tâm chạy một VPS một tiến trình nên không vướng.
 */

const OFFSET_KEY = "telegram_update_offset";
const LONG_POLL_SECONDS = 30;
const BACKOFF_START_MS = 5_000;
const BACKOFF_MAX_MS = 60_000;
/** Số ngày lịch trả về cho lệnh /lich. */
const SCHEDULE_DAYS = 7;

declare global {
  var __musicnoteTelegramBots: Set<BotKind> | undefined;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
    from?: { first_name?: string };
  };
}

const STAFF_HELP = [
  "Mình là bot báo việc cho quản lý / giáo vụ <b>Piano Guitar Đệm Hát</b>:",
  "• Khách mới đăng ký học thử trên web — báo ngay",
  "• Học thử ngày mai (20h) và trước mỗi buổi học thử",
  "• Lớp chưa có giáo viên (8h sáng + khi sắp học)",
  "",
  "<b>/lich</b> — học thử 7 ngày tới",
  "<b>/huy</b> — ngừng nhận tin",
  "",
  "Chưa kết nối thì đăng nhập web, vào mục <b>Nhắc lịch Telegram</b> rồi bấm nút kết nối.",
].join("\n");

const HELP = [
  "Mình là bot nhắc lịch của <b>Piano Guitar Đệm Hát</b>.",
  "",
  "<b>/lich</b> — xem lịch 7 ngày tới",
  "<b>/huy</b> — ngừng nhận nhắc lịch",
  "",
  "Chưa kết nối tài khoản thì đăng nhập web, vào mục <b>Nhắc lịch Telegram</b> rồi gửi mã ở đó cho mình.",
].join("\n");

/* ------------------------------------------------------------------ */
/* Lệnh                                                                 */
/* ------------------------------------------------------------------ */

/** Lịch 7 ngày tới của một người, dù họ là giáo viên hay học viên. */
function scheduleText(user: UserRow): string {
  const today = now();
  const lines: string[] = [];

  for (let i = 0; i < SCHEDULE_DAYS; i++) {
    const date = addDays(today, i);
    const iso = toISODate(date);
    const mine = listSessionsOn(iso).filter(
      (s) => s.cls.teacher_id === user.id || s.cls.student_user_id === user.id
    );
    if (mine.length === 0) continue;

    const head = i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : DAY_LABELS[date.getDay()];
    lines.push(`<b>${head} ${iso.slice(8, 10)}/${iso.slice(5, 7)}</b>`);
    for (const s of mine) {
      const range = formatTimeRange(s.time, s.cls.duration_minutes);
      const who =
        s.cls.teacher_id === user.id
          ? escapeHtml(s.cls.teacher_label || s.cls.student_name)
          : escapeHtml(s.cls.teacher_name ?? "chưa xếp giáo viên");
      lines.push(`• ${range} · ${escapeHtml(s.cls.subject)} — ${who}${s.moved ? " (học bù)" : ""}`);
    }
    lines.push("");
  }

  if (lines.length === 0) return "📅 7 ngày tới bạn chưa có buổi nào trên lịch.";
  return `📅 <b>Lịch 7 ngày tới</b>\n\n${lines.join("\n").trim()}`;
}

/** Học thử 7 ngày tới + số lớp chưa có giáo viên — /lich của bot quản lý. */
function staffScheduleText(): string {
  const today = now();
  const lines: string[] = [];
  for (let i = 0; i < SCHEDULE_DAYS; i++) {
    const date = addDays(today, i);
    const iso = toISODate(date);
    const trials = listSessionsOn(iso).filter(isTrialSession);
    if (trials.length === 0) continue;
    const head = i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : DAY_LABELS[date.getDay()];
    lines.push(`<b>${head} ${iso.slice(8, 10)}/${iso.slice(5, 7)}</b>`);
    for (const s of trials) {
      const phone = s.cls.student_phone ? ` · ${escapeHtml(s.cls.student_phone)}` : "";
      const teacher = s.cls.teacher_name ? `GV ${escapeHtml(s.cls.teacher_name)}` : "⚠️ chưa xếp GV";
      lines.push(
        `• ${formatTimeRange(s.time, s.cls.duration_minutes)} · ${escapeHtml(s.cls.subject)} — ${escapeHtml(s.cls.student_name)}${phone} (${teacher})`
      );
    }
    lines.push("");
  }
  const waiting = listClasses({ unassignedOnly: true, status: "active" }).length;
  const tail = waiting > 0 ? `\n\n📋 Còn <b>${waiting} lớp</b> chưa có giáo viên.` : "";
  if (lines.length === 0) return `🎯 7 ngày tới chưa có buổi học thử nào.${tail}`;
  return `🎯 <b>Học thử 7 ngày tới</b>\n\n${lines.join("\n").trim()}${tail}`;
}

async function handleMessage(bot: BotKind, chatId: string, rawText: string) {
  const text = rawText.trim();
  const user = userByChatId(chatId, bot);
  const help = bot === "staff" ? STAFF_HELP : HELP;
  const send = (body: string) => sendMessage(chatId, body, bot);

  // /start MÃ từ link t.me, hoặc người dùng gõ thẳng mã vào khung chat.
  const startPayload = text.startsWith("/start") ? text.slice("/start".length).trim() : "";
  const looksLikeCode = /^[A-Za-z0-9]{6,12}$/.test(text) && !text.startsWith("/");
  const code = startPayload || (looksLikeCode ? text : "");

  if (code) {
    const linked = linkChatToCode(code, chatId, bot);
    if (linked && "wrongBot" in linked) {
      const other = await getBotUsername(linked.wrongBot);
      await send(
        `Tài khoản này nhận tin qua bot ${other ? `@${other}` : "khác của trung tâm"}, không phải bot này.\n\n` +
          `Vào web, mục <b>Nhắc lịch Telegram</b>, bấm nút kết nối — nút sẽ mở đúng bot.`
      );
      return;
    }
    if (linked) {
      await send(
        `✅ Đã kết nối với tài khoản <b>${escapeHtml(linked.name)}</b>.\n\n` +
          (bot === "staff"
            ? `Từ giờ mình báo bạn khi có khách mới đăng ký, lịch học thử và lớp chưa có giáo viên.\n\nGõ /lich để xem học thử 7 ngày tới.`
            : `Từ giờ mình sẽ nhắn cho bạn lịch của ngày mai vào mỗi tối, và nhắc lại trước mỗi buổi khoảng một tiếng.\n\n` +
              `Gõ /lich để xem lịch 7 ngày tới.`)
      );
      return;
    }
    await send(
      "❌ Mã này không đúng hoặc đã dùng rồi.\n\nĐăng nhập web, vào mục <b>Nhắc lịch Telegram</b> để lấy mã mới nhé."
    );
    return;
  }

  if (text === "/start") {
    await send(help);
    return;
  }

  if (text === "/lich") {
    if (!user) {
      await send("Bạn chưa kết nối tài khoản nên mình chưa biết lịch của ai.\n\n" + help);
      return;
    }
    await send(bot === "staff" ? staffScheduleText() : scheduleText(user));
    return;
  }

  if (text === "/huy") {
    if (user) unlinkUser(user.id);
    await send("Đã ngừng nhắc lịch. Muốn bật lại thì lấy mã mới trên web rồi gửi cho mình.");
    return;
  }

  await send(help);
}

/* ------------------------------------------------------------------ */
/* Vòng hỏi tin                                                         */
/* ------------------------------------------------------------------ */

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms).unref());
}

async function pollForever(bot: BotKind) {
  const offsetKey = bot === "staff" ? `${OFFSET_KEY}_staff` : OFFSET_KEY;
  let offset = Number(getSetting(offsetKey) ?? 0) || 0;
  let backoff = BACKOFF_START_MS;

  for (;;) {
    const res = await callTelegram<TelegramUpdate[]>(
      "getUpdates",
      {
        offset,
        timeout: LONG_POLL_SECONDS,
        allowed_updates: ["message"],
      },
      bot
    );

    if (!res?.ok) {
      // Token sai hay mất mạng đều rơi vào đây; chờ lâu dần để khỏi quay
      // vòng liên tục làm đầy log.
      console.error(`[telegram:${bot}] không lấy được tin mới: ${res?.description ?? "không phản hồi"}`);
      await sleep(backoff);
      backoff = Math.min(backoff * 2, BACKOFF_MAX_MS);
      continue;
    }
    backoff = BACKOFF_START_MS;

    for (const update of res.result ?? []) {
      // Tăng mốc TRƯỚC khi xử lý: một tin gây lỗi cũng không được lặp lại mãi.
      offset = update.update_id + 1;
      setSetting(offsetKey, String(offset));
      const message = update.message;
      if (!message?.text) continue;
      try {
        await handleMessage(bot, String(message.chat.id), message.text);
      } catch (e) {
        console.error("[telegram] xử lý tin hỏng:", e);
      }
    }
  }
}

/** Mỗi bot đã khai token một vòng hỏi tin riêng. */
export function startTelegramBot() {
  const running = (globalThis.__musicnoteTelegramBots ??= new Set());
  for (const bot of enabledBots()) {
    if (running.has(bot)) continue;
    running.add(bot);
    void pollForever(bot).catch((e) => {
      running.delete(bot);
      console.error(`[telegram:${bot}] vòng hỏi tin dừng:`, e);
    });
    console.log(`[telegram] bot ${bot === "staff" ? "quản lý" : "nhắc lịch"} đang lắng nghe`);
  }
}
