"use client";

import { useActionState } from "react";
import { previewTomorrowAction, type TelegramActionState } from "@/actions/telegram";
import { IconAlert, IconCheck } from "@/components/icons";
import { btn } from "@/components/ui";

const initialState: TelegramActionState = {};

/**
 * Nút xem trước lời nhắc. Lời nhắc thật chỉ chạy lúc 20h hoặc sát giờ học,
 * nên cài bot xong mà không có nút này thì phải ngồi đợi mới biết nó chạy.
 */
export default function TelegramPreview() {
  const [state, run, pending] = useActionState(previewTomorrowAction, initialState);

  return (
    <div className="mt-4 border-t border-navy-100 pt-4">
      <form action={run}>
        <button type="submit" disabled={pending} className={btn.secondary}>
          {pending ? "Đang gửi…" : "Gửi thử lịch ngày mai cho tôi"}
        </button>
      </form>
      <p className="text-xs text-ink-500 mt-2">
        Gửi ngay lịch ngày mai của cả trung tâm vào Telegram của bạn, để xem bản tin nhắc trông
        thế nào mà không phải đợi tới 20h.
      </p>
      {state.success && (
        <p className="flex items-center gap-1.5 text-sm text-mint-700 mt-2">
          <IconCheck className="w-4 h-4 shrink-0" />
          {state.message ?? "Đã gửi."}
        </p>
      )}
      {state.error && (
        <p className="flex items-center gap-1.5 text-sm text-coral-600 mt-2">
          <IconAlert className="w-4 h-4 shrink-0" />
          {state.error}
        </p>
      )}
    </div>
  );
}
