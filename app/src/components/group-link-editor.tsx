"use client";

import { useState, useTransition } from "react";
import { setClassGroupLinkAction } from "@/actions/classes";

/**
 * Link nhóm lớp (Messenger / Zalo) của một khách: chưa có thì hiện ô dán link,
 * có rồi thì nút mở nhóm + sửa. Giáo viên dùng link này để gửi điểm danh.
 */
export function GroupLinkEditor({ classId, url }: { classId: number; url: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const r = await setClassGroupLinkAction(classId, value);
      if (r.error) setError(r.error);
      else setEditing(false);
    });
  }

  if (url && !editing) {
    return (
      <span className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="text-ink-500 shrink-0">Nhóm lớp:</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 truncate rounded-md bg-mint-50 px-2 py-0.5 font-semibold text-mint-700 hover:underline"
        >
          💬 Mở nhóm
        </a>
        <button
          type="button"
          onClick={() => {
            setValue(url);
            setEditing(true);
          }}
          className="shrink-0 rounded-md border border-navy-200 px-2 py-0.5 font-semibold text-wood-700 hover:bg-ivory-100"
        >
          Sửa link
        </button>
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), save())}
          placeholder="Dán link nhóm lớp (Messenger / Zalo)"
          aria-label="Link nhóm lớp"
          className="min-w-0 flex-1 rounded-lg border border-navy-200 px-2.5 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || (!value.trim() && !url)}
          className="shrink-0 rounded-lg bg-wood-500 hover:bg-wood-600 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white"
        >
          {pending ? "Đang lưu…" : "Lưu"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            className="shrink-0 text-xs text-ink-500 hover:underline"
          >
            Huỷ
          </button>
        )}
      </div>
      {!url && !error && <p className="text-[11px] text-amber-700">Chưa gắn nhóm lớp — lập nhóm xong dán link vào đây.</p>}
      {error && <p className="text-[11px] text-coral-700">{error}</p>}
    </div>
  );
}
