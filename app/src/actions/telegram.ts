"use server";

import { revalidatePath } from "next/cache";
import { assertRole, assertSession } from "@/lib/guard";
import { ADMIN_AREA_ROLES } from "@/lib/types";
import { escapeHtml, sendToUser, unlinkUser } from "@/lib/telegram";
import { sendTomorrowPreview } from "@/lib/telegram-reminders";

export interface TelegramActionState {
  error?: string;
  success?: boolean;
  /** Câu trả lời cụ thể cho thao tác vừa làm, VD đã gửi lịch mấy buổi. */
  message?: string;
}

/** Ngắt Telegram của chính mình — ai cũng tự bật tắt được phần nhắc của họ. */
export async function unlinkTelegramAction(): Promise<TelegramActionState> {
  const session = await assertSession();
  unlinkUser(session.userId);
  revalidatePath("/account/telegram");
  return { success: true };
}

/**
 * Gửi một tin thử. Có nút này vì "đã kết nối" trên web mà điện thoại im lặng
 * là tình huống khó đoán nhất — bấm một cái là biết ngay đường đi có thông.
 */
export async function testTelegramAction(): Promise<TelegramActionState> {
  const session = await assertSession();
  const sent = await sendToUser(
    session.userId,
    `✅ Tin thử từ Piano Guitar Đệm Hát.\nChào ${escapeHtml(session.name)}, bạn sẽ nhận nhắc lịch ở đây.`
  );
  if (!sent) return { error: "Chưa gửi được. Bạn thử ngắt rồi kết nối lại xem sao." };
  return { success: true };
}

/**
 * Xem trước lời nhắc: gửi ngay lịch ngày mai của cả trung tâm cho chính người
 * bấm, để kiểm tra bot chạy đúng mà không phải đợi tới 20h.
 */
export async function previewTomorrowAction(): Promise<TelegramActionState> {
  const session = await assertRole(ADMIN_AREA_ROLES);
  const { sent, count } = await sendTomorrowPreview(session.userId);
  if (!sent) {
    return { error: "Tài khoản của bạn chưa nối Telegram — vào mục Nhắc lịch Telegram để nối." };
  }
  return {
    success: true,
    message:
      count === 0
        ? "Đã gửi. Ngày mai chưa có buổi nào nên bản tin báo trống."
        : `Đã gửi lịch ${count} buổi của ngày mai vào Telegram của bạn.`,
  };
}
