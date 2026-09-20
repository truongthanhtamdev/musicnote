"use server";

import { revalidatePath } from "next/cache";
import { assertSession } from "@/lib/guard";
import { escapeHtml, sendToUser, unlinkUser } from "@/lib/telegram";
import type { FormState } from "./account";

/** Ngắt Telegram của chính mình — ai cũng tự bật tắt được phần nhắc của họ. */
export async function unlinkTelegramAction(): Promise<FormState> {
  const session = await assertSession();
  unlinkUser(session.userId);
  revalidatePath("/account/telegram");
  return { success: true };
}

/**
 * Gửi một tin thử. Có nút này vì "đã kết nối" trên web mà điện thoại im lặng
 * là tình huống khó đoán nhất — bấm một cái là biết ngay đường đi có thông.
 */
export async function testTelegramAction(): Promise<FormState> {
  const session = await assertSession();
  const sent = await sendToUser(
    session.userId,
    `✅ Tin thử từ Piano Guitar Đệm Hát.\nChào ${escapeHtml(session.name)}, bạn sẽ nhận nhắc lịch ở đây.`
  );
  if (!sent) return { error: "Chưa gửi được. Bạn thử ngắt rồi kết nối lại xem sao." };
  return { success: true };
}
