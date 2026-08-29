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
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
      }`}
    >
      {active ? "Ngừng hoạt động" : "Kích hoạt lại"}
    </button>
  );
}
