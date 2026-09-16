import { requireRole } from "@/lib/guard";
import { getDigestTime, getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/types";
import { PageHeader } from "@/components/app-shell";
import TelegramForm from "./telegram-form";

export default async function SettingsPage() {
  await requireRole(["admin"]);

  return (
    <>
      <PageHeader
        eyebrow="Cấu hình hệ thống"
        title="Nhắc việc"
        sub="Hệ thống nhắn vào Telegram trước mỗi lịch hẹn, và gửi bản tóm tắt cả ngày vào buổi sáng."
      />

      <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="panel p-[18px]">
          <h2 className="panel-title mb-4">Kết nối Telegram</h2>
          <TelegramForm
            token={getSetting(SETTING_KEYS.telegramToken) || ""}
            chatId={getSetting(SETTING_KEYS.telegramChatId) || ""}
            enabled={(getSetting(SETTING_KEYS.remindersEnabled) ?? "true") === "true"}
            digestTime={getDigestTime()}
            baseUrl={getSetting(SETTING_KEYS.appBaseUrl) || ""}
          />
        </div>

        <div className="panel p-[18px]">
          <h2 className="panel-title mb-3">Lấy token và chat ID thế nào</h2>
          <ol className="space-y-3 text-[13px] text-ink-soft">
            <li>
              <b className="text-ink">1.</b> Mở Telegram, tìm <b className="text-ink">@BotFather</b>,
              nhắn <code className="rounded bg-line-soft px-1">/newbot</code>, đặt tên bất kỳ.
              BotFather trả về một dãy dạng <code className="rounded bg-line-soft px-1">123456:AAH…</code>{" "}
              — đó là <b className="text-ink">bot token</b>.
            </li>
            <li>
              <b className="text-ink">2.</b> Tìm bot vừa tạo, bấm <b className="text-ink">Start</b>.
              Bước này bắt buộc: Telegram không cho bot nhắn trước cho người lạ.
            </li>
            <li>
              <b className="text-ink">3.</b> Tìm <b className="text-ink">@userinfobot</b>, bấm Start
              — nó hiện <b className="text-ink">Id</b> của bạn, đó là <b className="text-ink">chat ID</b>.
            </li>
            <li>
              <b className="text-ink">4.</b> Dán hai dãy đó vào bên trái, bấm{" "}
              <b className="text-ink">Lưu</b> rồi <b className="text-ink">Gửi tin thử</b>.
            </li>
          </ol>
          <p className="mt-4 border-t border-line-soft pt-3 text-[12.5px] text-muted">
            Muốn cả giáo vụ cùng nhận: tạo một nhóm Telegram, thêm bot vào nhóm, rồi dùng chat ID
            của nhóm (số âm, VD <code className="rounded bg-line-soft px-1">-1001234567890</code>).
          </p>
        </div>
      </div>
    </>
  );
}
