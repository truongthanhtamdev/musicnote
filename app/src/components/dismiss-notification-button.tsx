"use client";

import { useTransition } from "react";
import { markNotificationReadAction } from "@/actions/notifications";

export function DismissNotificationButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => markNotificationReadAction(id))}
      className="shrink-0 text-sky-700 hover:text-sky-900 disabled:opacity-60"
      aria-label="Đã đọc"
    >
      Đã đọc ✕
    </button>
  );
}
