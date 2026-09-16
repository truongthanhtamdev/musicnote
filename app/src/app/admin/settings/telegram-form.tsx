"use client";

import { useActionState, useState, useTransition } from "react";
import {
  saveTelegramSettingsAction,
  sendDigestNowAction,
  sendTestTelegramAction,
  type SettingsFormState,
} from "@/actions/settings";

const initialState: SettingsFormState = {};

export default function TelegramForm({
  token,
  chatId,
  enabled,
  digestTime,
  baseUrl,
}: {
  token: string;
  chatId: string;
  enabled: boolean;
  digestTime: string;
  baseUrl: string;
}) {
  const [state, formAction, pending] = useActionState(saveTelegramSettingsAction, initialState);
  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<SettingsFormState | null>(null);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <label className="flex items-center gap-2.5 rounded-lg border border-line bg-brand-50/40 px-3 py-2.5">
          <input
            type="checkbox"
            name="reminders_enabled"
            defaultChecked={enabled}
            className="size-4 accent-brand-600"
          />
          <span className="text-[13.5px] font-medium text-ink">
            Bật nhắc lịch qua Telegram
          </span>
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">Bot token</label>
            <input
              name="telegram_token"
              defaultValue={token}
              placeholder="123456789:AAH..."
              className="input"
            />
          </div>
          <div>
            <label className="label">Chat ID (của bạn hoặc nhóm)</label>
            <input
              name="telegram_chat_id"
              defaultValue={chatId}
              placeholder="VD: 987654321"
              className="input"
            />
          </div>
          <div>
            <label className="label">Giờ gửi tóm tắt mỗi sáng</label>
            <input
              type="time"
              name="daily_digest_time"
              defaultValue={digestTime}
              className="input"
            />
          </div>
          <div>
            <label className="label">Địa chỉ web (để tin nhắn kèm link)</label>
            <input
              name="app_base_url"
              defaultValue={baseUrl}
              placeholder="http://112.78.3.53:3001"
              className="input"
            />
          </div>
        </div>

        {state.error && <p className="text-[13px] text-rose-600">{state.error}</p>}
        {state.success && <p className="text-[13px] text-brand-600">Đã lưu cài đặt.</p>}

        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
        <button
          type="button"
          disabled={testing}
          onClick={() => startTest(async () => setTestResult(await sendTestTelegramAction()))}
          className="btn btn-ghost"
        >
          Gửi tin thử
        </button>
        <button
          type="button"
          disabled={testing}
          onClick={() => startTest(async () => setTestResult(await sendDigestNowAction()))}
          className="btn btn-ghost"
        >
          Gửi tóm tắt hôm nay
        </button>
        {testing && <span className="text-[12.5px] text-muted">Đang gửi...</span>}
      </div>

      {testResult?.info && (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-[13px] text-brand-700">
          {testResult.info}
        </p>
      )}
      {testResult?.error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          {testResult.error}
        </p>
      )}
    </div>
  );
}
