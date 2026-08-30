"use client";

import { useTransition } from "react";
import { deletePaymentAction } from "@/actions/finance";

export default function DeletePaymentButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Xoá khoản thu này?")) startTransition(() => deletePaymentAction(id));
      }}
      className="text-xs text-red-600 hover:underline disabled:opacity-60"
    >
      Xoá
    </button>
  );
}
