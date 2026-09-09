"use client";

import { useTransition } from "react";
import { inlineAction } from "@/components/ui";
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
      className={`${inlineAction} text-xs text-coral-600 hover:underline disabled:opacity-60`}
    >
      Xoá
    </button>
  );
}
