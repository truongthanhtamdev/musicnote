"use client";

import { useState } from "react";

/**
 * Tên nhóm Facebook / Messenger của lớp theo cú pháp thống nhất
 * "Môn - Phụ huynh - GV Giáo viên", kèm nút sao chép để dán thẳng khi đổi tên nhóm.
 */
export function GroupNameCopy({ name, compact = false }: { name: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(name);
    } catch {
      // Trình duyệt chặn clipboard: chọn sẵn chữ để người dùng tự sao chép.
      window.prompt("Sao chép tên nhóm:", name);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <span className={`inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 ${compact ? "text-xs" : "text-sm"}`}>
      <span className="text-ink-500 shrink-0">Tên nhóm FB:</span>
      <code className="min-w-0 break-words rounded-md bg-ivory-100 px-2 py-0.5 font-sans font-semibold text-ink-800">{name}</code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-md border border-navy-200 px-2 py-0.5 font-semibold text-wood-700 hover:bg-ivory-100"
      >
        {copied ? "✓ Đã chép" : "Sao chép"}
      </button>
    </span>
  );
}
