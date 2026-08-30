"use client";

import { useTransition } from "react";
import { deleteExpenseAction } from "@/actions/finance";

export default function DeleteExpenseButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Xoá khoản chi phí này?")) startTransition(() => deleteExpenseAction(id));
      }}
      className="text-xs text-red-600 hover:underline disabled:opacity-60"
    >
      Xoá
    </button>
  );
}
