"use client";

import { useTransition } from "react";
import { deleteClipAction, setClipPublicAction } from "@/actions/clips";
import { ClipPlayer } from "@/components/clip-player";
import type { ClipRow } from "@/lib/clip-url";
import { inlineAction } from "@/components/ui";

export default function ClipItem({ clip }: { clip: ClipRow }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className={pending ? "opacity-60" : ""}>
      <ClipPlayer clip={clip} />
      <p className="mt-2 text-sm font-medium text-ink-900 leading-snug">{clip.title || "(chưa có mô tả)"}</p>
      {clip.subject && <p className="text-xs text-wood-600 font-semibold">{clip.subject}</p>}
      <label className="mt-2 flex items-center gap-2 text-xs text-ink-600">
        <input
          type="checkbox"
          checked={!!clip.is_public}
          disabled={pending}
          onChange={(e) => startTransition(() => setClipPublicAction(clip.id, e.target.checked))}
          className="w-4 h-4 accent-wood-500"
        />
        Hiện trên trang chủ
      </label>
      <div className="mt-1.5 flex items-center gap-3 text-xs">
        <a href={clip.url} target="_blank" rel="noopener noreferrer" className={`${inlineAction} font-semibold text-ink-500 hover:text-ink-900`}>
          Mở link gốc
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Xoá clip này khỏi web? (Clip trên kênh vẫn còn.)")) {
              startTransition(() => deleteClipAction(clip.id));
            }
          }}
          className={`${inlineAction} font-semibold text-coral-600 hover:text-coral-700`}
        >
          Xoá
        </button>
      </div>
    </li>
  );
}
