"use client";

import { useTransition } from "react";
import { markNotificationReadAction } from "@/actions/notifications";
import { IconX } from "./icons";

export function DismissNotificationButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => markNotificationReadAction(id))}
      className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-navy-600 hover:text-navy-800 disabled:opacity-60 rounded-lg px-2 py-1 hover:bg-white/60 transition"
      aria-label="Đánh dấu đã đọc"
    >
      Đã đọc
      <IconX className="w-3.5 h-3.5" />
    </button>
  );
}
