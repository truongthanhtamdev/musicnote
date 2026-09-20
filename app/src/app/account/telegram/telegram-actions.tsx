"use client";

import { useActionState } from "react";
import { testTelegramAction, unlinkTelegramAction } from "@/actions/telegram";
import type { FormState } from "@/actions/account";
import { IconAlert, IconCheck } from "@/components/icons";
import { btn } from "@/components/ui";

const initialState: FormState = {};

export default function TelegramActions() {
  const [testState, runTest, testing] = useActionState(testTelegramAction, initialState);
  const [unlinkState, runUnlink, unlinking] = useActionState(unlinkTelegramAction, initialState);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2.5">
        <form action={runTest}>
          <button type="submit" disabled={testing} className={btn.secondary}>
            {testing ? "Đang gửi…" : "Gửi tin thử"}
          </button>
        </form>
        <form action={runUnlink}>
          <button type="submit" disabled={unlinking} className={btn.ghost}>
            {unlinking ? "Đang ngắt…" : "Ngắt kết nối"}
          </button>
        </form>
      </div>

      {testState.success && (
        <p className="flex items-center gap-1.5 text-sm text-mint-700">
          <IconCheck className="w-4 h-4" />
          Đã gửi — mở Telegram xem nhé.
        </p>
      )}
      {testState.error && (
        <p className="flex items-center gap-1.5 text-sm text-coral-600">
          <IconAlert className="w-4 h-4" />
          {testState.error}
        </p>
      )}
      {unlinkState.success && (
        <p className="text-sm text-ink-500">Đã ngắt. Tải lại trang để lấy mã kết nối mới.</p>
      )}
    </div>
  );
}
