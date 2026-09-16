"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/guard";
import { setSetting } from "@/lib/settings";
import { buildDigest } from "@/lib/reminders";
import { sendTelegram } from "@/lib/telegram";
import { SETTING_KEYS } from "@/lib/types";
import type { FormState } from "./teachers";

export interface SettingsFormState extends FormState {
  info?: string;
}

export async function saveTelegramSettingsAction(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await assertRole(["admin"]);

  const token = String(formData.get("telegram_token") || "").trim();
  const chatId = String(formData.get("telegram_chat_id") || "").trim();
  const enabled = formData.get("reminders_enabled") ? "true" : "false";
  const digestTime = String(formData.get("daily_digest_time") || "07:30").trim();
  const baseUrl = String(formData.get("app_base_url") || "").trim();

  if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(digestTime)) {
    return { error: "Giờ gửi tóm tắt không hợp lệ, cần dạng HH:MM" };
  }

  setSetting(SETTING_KEYS.telegramToken, token);
  setSetting(SETTING_KEYS.telegramChatId, chatId);
  setSetting(SETTING_KEYS.remindersEnabled, enabled);
  setSetting(SETTING_KEYS.dailyDigestTime, digestTime);
  setSetting(SETTING_KEYS.appBaseUrl, baseUrl.replace(/\/$/, ""));

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function sendTestTelegramAction(): Promise<SettingsFormState> {
  await assertRole(["admin"]);
  const res = await sendTelegram(
    "✅ <b>ClientHub đã kết nối Telegram</b>\nTừ giờ mọi lịch hẹn với khách sẽ được nhắc ở đây."
  );
  return res.ok
    ? { info: "Đã gửi tin thử — mở Telegram kiểm tra nhé." }
    : { error: res.error || "Không gửi được" };
}

/** Gửi ngay bản tóm tắt hôm nay, để xem thử nội dung trước khi tới giờ tự gửi. */
export async function sendDigestNowAction(): Promise<SettingsFormState> {
  await assertRole(["admin"]);
  const res = await sendTelegram(buildDigest());
  return res.ok
    ? { info: "Đã gửi bản tóm tắt hôm nay qua Telegram." }
    : { error: res.error || "Không gửi được" };
}
