import { getTelegramConfig } from "./settings";

// Địa chỉ API tách ra biến môi trường để chạy thử được với máy chủ giả; khi
// không đặt thì dùng thẳng Telegram thật.

export interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * Gửi tin nhắn vào Telegram. Không ném lỗi ra ngoài: việc nhắc lịch hỏng thì
 * ghi log và báo ở trang cài đặt, chứ không được làm sập trang đang dùng.
 */
export async function sendTelegram(text: string): Promise<SendResult> {
  const cfg = getTelegramConfig();
  if (!cfg) return { ok: false, error: "Chưa cấu hình Telegram (thiếu token hoặc chat id)" };

  try {
    const api = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";
    const res = await fetch(`${api}/bot${cfg.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      return { ok: false, error: `Telegram trả về ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Không gọi được Telegram: ${(err as Error).message}` };
  }
}

/** Escape ký tự đặc biệt của HTML để tên khách có dấu < > & không làm hỏng tin. */
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
