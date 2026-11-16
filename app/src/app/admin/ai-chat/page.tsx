import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { MANAGE_ROLES } from "@/lib/types";
import { localFromSqlUtc } from "@/lib/format";
import { getChatTranscript, listRecentChats } from "@/lib/ai-chat";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";

function when(sqlUtc: string) {
  const t = localFromSqlUtc(sqlUtc);
  return `${t.slice(8, 10)}/${t.slice(5, 7)} ${t.slice(11, 16)}`;
}

/**
 * Các cuộc chat của khách với AI tư vấn: đọc lại trước khi gọi khách, và xem
 * những khách đã hỏi mà chưa để lại lịch (khách tiềm năng để chăm tiếp).
 */
export default async function AiChatsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireRole(MANAGE_ROLES);
  const { id } = await searchParams;
  const chats = listRecentChats();
  const open = id ? getChatTranscript(id) : null;
  const booked = chats.filter((c) => c.trialRequestId).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chat AI tư vấn"
        subtitle={`${chats.length} cuộc chat gần nhất · ${booked} khách đã để lại lịch học thử. Khách chưa để lại lịch vẫn là khách tiềm năng — đọc lại để chăm tiếp.`}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card padded={false}>
          <CardHeader title="Cuộc chat" count={chats.length} />
          {chats.length === 0 ? (
            <EmptyState title="Chưa có ai chat" description="Khách bấm “Tư vấn & đặt lịch” ở trang chủ là hiện ở đây." />
          ) : (
            <ul className="divide-y divide-navy-100">
              {chats.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/ai-chat?id=${c.id}`}
                    className={`block px-5 py-3 hover:bg-ivory-50 ${c.id === id ? "bg-ivory-100" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-ink-500 tabular">
                      <span>{when(c.updatedAt)} · {c.userTurns} tin</span>
                      {c.trialRequestId ? (
                        <span className="rounded-full bg-mint-50 px-2 py-0.5 font-semibold text-mint-700">
                          ✓ Đã đặt lịch{c.bookedName ? `: ${c.bookedName}` : ""}
                        </span>
                      ) : (
                        <span className="rounded-full bg-ivory-100 px-2 py-0.5 font-semibold text-ink-500">Chưa để lại lịch</span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-ink-800">{c.firstMessage || "…"}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padded={false}>
          <CardHeader title={open ? `Nội dung chat · bắt đầu ${when(open.createdAt)}` : "Nội dung chat"} />
          {!open ? (
            <EmptyState title="Chọn một cuộc chat bên trái để đọc" />
          ) : (
            <div className="space-y-3 bg-ivory-50 p-4">
              {open.trialRequestId && (
                <Link
                  href="/admin/trial-requests"
                  className="block rounded-xl border border-mint-200 bg-mint-50 px-3 py-2 text-sm font-semibold text-mint-700 hover:underline"
                >
                  ✓ AI đã ghi đăng ký học thử từ cuộc chat này — mở Đăng ký học thử →
                </Link>
              )}
              {open.turns.map((t, i) => (
                <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                  <p
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm ${
                      t.role === "user" ? "bg-wood-500 text-white" : "border border-navy-100 bg-white text-ink-800"
                    }`}
                  >
                    <span className="mb-0.5 block text-[11px] font-semibold opacity-70">{t.role === "user" ? "Khách" : "AI"}</span>
                    {t.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
