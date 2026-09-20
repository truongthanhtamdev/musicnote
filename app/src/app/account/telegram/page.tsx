import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/guard";
import { getUserById } from "@/lib/auth";
import { roleHomePath } from "@/lib/types";
import { getBotUsername, linkCodeFor, telegramEnabled } from "@/lib/telegram";
import { Logo } from "@/components/logo";
import { IconChevronLeft, IconTelegram } from "@/components/icons";
import { Card, CardHeader } from "@/components/ui";
import TelegramActions from "./telegram-actions";

export const metadata: Metadata = { title: "Nhắc lịch Telegram", robots: { index: false } };

export default async function TelegramPage() {
  const session = await requireSession();
  const user = getUserById(session.userId);
  const linked = Boolean(user?.telegram_chat_id);

  // Chỉ sinh mã khi thật sự cần hiện: đã kết nối rồi mà vẫn sinh mã mới là
  // tạo ra một mã sống vô ích, ai nhặt được là nối nhầm vào tài khoản này.
  const code = telegramEnabled() && !linked ? linkCodeFor(session.userId) : null;
  const botUsername = await getBotUsername();
  const deepLink = botUsername && code ? `https://t.me/${botUsername}?start=${code}` : null;

  return (
    <div className="min-h-screen bg-ivory-50">
      <header className="bg-navy-950 text-white">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <span className="flex items-center gap-2.5 min-w-0">
            <Logo className="h-8 shrink-0" />
            <span className="font-bold text-[15px] leading-tight">Piano Guitar Đệm Hát</span>
          </span>
          <Link
            href={roleHomePath(session.role)}
            className="inline-flex items-center gap-1 text-sm font-medium text-navy-200 hover:text-white transition"
          >
            <IconChevronLeft className="w-4 h-4" />
            Về trang chính
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <Card padded={false}>
          <CardHeader
            title="Nhắc lịch qua Telegram"
            icon={<IconTelegram className="w-4.5 h-4.5 text-wood-500" />}
          />
          <div className="p-5 space-y-4">
            {!telegramEnabled() ? (
              <p className="text-sm text-ink-500">
                Trung tâm chưa bật bot Telegram. Bạn nhắn cho quản lý để được bật giúp nhé.
              </p>
            ) : linked ? (
              <>
                <div className="rounded-xl border border-mint-200 bg-mint-50 px-4 py-3">
                  <p className="font-semibold text-ink-900">Đã kết nối</p>
                  <p className="text-sm text-ink-600 mt-1">
                    Mỗi tối bạn nhận lịch của ngày mai, và trước mỗi buổi khoảng một tiếng sẽ có
                    thêm một tin nhắc.
                  </p>
                </div>
                <TelegramActions />
              </>
            ) : (
              <>
                <p className="text-sm text-ink-600">
                  Nối tài khoản với Telegram để nhận nhắc lịch thẳng vào điện thoại — khỏi phải vào
                  web kiểm tra.
                </p>

                {deepLink ? (
                  <a
                    href={deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    <IconTelegram className="w-4.5 h-4.5" />
                    Mở Telegram và kết nối
                  </a>
                ) : (
                  <p className="text-sm text-ink-500">
                    Chưa lấy được tên bot. Bạn mở Telegram, tìm bot của trung tâm rồi gửi mã bên
                    dưới cho bot.
                  </p>
                )}

                <div className="rounded-xl border border-navy-100 bg-ivory-50 px-4 py-3">
                  <p className="text-xs text-ink-500">Mã kết nối của bạn</p>
                  <p className="font-mono text-xl font-bold tracking-widest text-wood-700">{code}</p>
                  <p className="text-xs text-ink-500 mt-1.5">
                    Bấm nút trên là xong. Nếu nút không mở được, gửi mã này vào khung chat với bot.
                    Mã chỉ dùng được một lần.
                  </p>
                </div>
              </>
            )}

            <div className="border-t border-navy-100 pt-4 text-sm text-ink-500">
              <p className="font-medium text-ink-700">Lệnh dùng được với bot</p>
              <p className="mt-1">
                <span className="font-mono text-ink-900">/lich</span> — xem lịch 7 ngày tới
                <br />
                <span className="font-mono text-ink-900">/huy</span> — ngừng nhận nhắc lịch
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
