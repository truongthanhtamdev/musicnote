import { db } from "./db";
import { SETTING_KEYS } from "./types";

export function getSetting(key: string): string | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value);
}

export interface TelegramConfig {
  token: string;
  chatId: string;
  enabled: boolean;
}

/** Cấu hình Telegram, lấy từ giao diện cài đặt; biến môi trường chỉ là dự phòng. */
export function getTelegramConfig(): TelegramConfig | null {
  const token = getSetting(SETTING_KEYS.telegramToken) || process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = getSetting(SETTING_KEYS.telegramChatId) || process.env.TELEGRAM_CHAT_ID || "";
  if (!token || !chatId) return null;
  return {
    token,
    chatId,
    enabled: (getSetting(SETTING_KEYS.remindersEnabled) ?? "true") === "true",
  };
}

/** Giờ gửi bản tóm tắt đầu ngày, dạng HH:MM. */
export function getDigestTime(): string {
  return getSetting(SETTING_KEYS.dailyDigestTime) || "07:30";
}
