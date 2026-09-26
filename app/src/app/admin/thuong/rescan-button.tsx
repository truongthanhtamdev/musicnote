"use client";

import { useTransition } from "react";
import { rescanTrialBonusesAction } from "@/actions/bonus";
import { btn } from "@/components/ui";

/** Ghi bổ sung các khoản học thử bị sót trong kỳ đang xem. Bấm nhiều lần vô hại. */
export default function RescanButton({ from, to }: { from: string; to: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => rescanTrialBonusesAction(from, to))}
      className={btn.secondary}
    >
      {pending ? "Đang ghi…" : "Ghi bổ sung các khoản này"}
    </button>
  );
}
