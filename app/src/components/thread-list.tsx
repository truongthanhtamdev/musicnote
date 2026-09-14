import Link from "next/link";
import type { ReactNode } from "react";
import type { MessageThread } from "@/lib/queries";
import { Avatar, EmptyState } from "./ui";

/**
 * Danh sách hội thoại theo lớp. Lớp chưa ai nhắn gì vẫn hiện, để bên nào cũng
 * mở lời trước được — chứ danh sách rỗng thì không ai biết bắt đầu từ đâu.
 */
export default function ThreadList({
  threads,
  basePath,
  emptyTitle,
  emptyHint,
  icon,
}: {
  threads: MessageThread[];
  basePath: string;
  emptyTitle: string;
  emptyHint: string;
  icon: ReactNode;
}) {
  if (threads.length === 0) {
    return <EmptyState icon={icon} title={emptyTitle} description={emptyHint} />;
  }

  return (
    <ul className="divide-y divide-navy-100">
      {threads.map((t) => (
        <li key={t.classId}>
          <Link
            href={`${basePath}/${t.classId}`}
            className="flex items-center gap-3 px-5 py-3.5 hover:bg-ivory-50 transition"
          >
            <Avatar name={t.title} className="w-10 h-10 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-900 truncate">{t.title}</p>
              <p className="text-sm text-ink-500 truncate">{t.subtitle}</p>
              {t.lastBody && (
                <p className={`text-sm truncate mt-0.5 ${t.unread ? "text-ink-900 font-medium" : "text-ink-400"}`}>
                  {t.lastBody}
                </p>
              )}
            </div>
            {t.unread > 0 && (
              <span className="shrink-0 bg-coral-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 grid place-items-center tabular">
                {t.unread}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
