"use client";

import { useTransition } from "react";
import { toggleTeacherActiveAction } from "@/actions/teachers";

export default function ToggleActiveButton({
  teacherId,
  active,
}: {
  teacherId: number;
  active: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => toggleTeacherActiveAction(teacherId, !active))}
      className={`text-sm font-medium rounded-lg px-3 py-1.5 border transition ${
        active
          ? "border-coral-100 text-coral-600 hover:bg-coral-50"
          : "border-mint-100 text-mint-600 hover:bg-mint-50"
      }`}
    >
      {active ? "Ngừng hoạt động" : "Kích hoạt lại"}
    </button>
  );
}
