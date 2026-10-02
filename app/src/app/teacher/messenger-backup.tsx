"use client";

import { useState, useTransition } from "react";
import { confirmMessengerBackupAction } from "@/actions/attendance";
import { IconChat } from "@/components/icons";
import { btn } from "@/components/ui";

export interface BackupItem {
  key: string;
  classId: number;
  sessionDate: string;
  /** "Anh Mike · 02/10" */
  title: string;
  message: string;
  messengerUrl: string | null;
}

/**
 * Buổi đã điểm danh trên web nhưng chưa đăng bản sao lên nhóm Messenger của
 * lớp. Mỗi dòng: tin soạn sẵn, nút chép + mở đúng nhóm, và nút "Đã gửi".
 */
export default function MessengerBackupList({ items }: { items: BackupItem[] }) {
  return (
    <ul className="divide-y divide-navy-100">
      {items.map((it) => (
        <BackupRow key={it.key} item={it} />
      ))}
    </ul>
  );
}

function BackupRow({ item }: { item: BackupItem }) {
  const [text, setText] = useState(item.message);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Trình duyệt chặn clipboard: mở sẵn ô chữ và chọn hết để giáo viên tự chép.
      setOpen(true);
      requestAnimationFrame(() => {
        const el = document.getElementById(`mb-${item.key}`) as HTMLTextAreaElement | null;
        el?.select();
        document.execCommand("copy");
      });
    }
    setCopied(true);
  }

  return (
    <li className={`px-4 sm:px-5 py-3 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-ink-900 basis-full sm:basis-auto sm:flex-1 min-w-0">{item.title}</p>
        {item.messengerUrl ? (
          <a
            href={item.messengerUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void copy()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00B2FF] to-[#A033FF] text-white px-3.5 py-2 text-sm font-semibold hover:brightness-110"
          >
            <IconChat className="w-4 h-4" />
            Copy &amp; mở nhóm
          </a>
        ) : (
          <button type="button" onClick={() => void copy()} className={`${btn.secondary} py-2`}>
            <IconChat className="w-4 h-4" />
            Copy tin
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => confirmMessengerBackupAction(item.classId, item.sessionDate))}
          className={`${btn.primary} py-2`}
        >
          ✓ Đã gửi
        </button>
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 text-xs font-semibold text-ink-500 hover:text-ink-800"
      >
        {open ? "Ẩn tin nhắn" : "Xem / sửa tin nhắn"}
      </button>
      {open && (
        <textarea
          id={`mb-${item.key}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-navy-200 bg-ivory-50 px-3 py-2 text-sm"
        />
      )}
      {copied && (
        <p className="text-xs text-mint-700 mt-1">Đã chép tin — dán vào nhóm Messenger, gửi xong bấm “Đã gửi”.</p>
      )}
      {!item.messengerUrl && (
        <p className="text-xs text-ink-400 mt-1">
          Lớp chưa gắn link nhóm Messenger — gắn ở Lịch dạy → Sửa để lần sau bấm là mở đúng nhóm.
        </p>
      )}
    </li>
  );
}
