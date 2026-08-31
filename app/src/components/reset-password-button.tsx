"use client";

import { useActionState, useState } from "react";
import { adminResetPasswordAction, type FormState } from "@/actions/account";

const initialState: FormState = {};

export default function ResetPasswordButton({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(adminResetPasswordAction, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gold-700 hover:underline"
      >
        Đặt lại mật khẩu
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center justify-end gap-1.5">
      <input type="hidden" name="user_id" value={userId} />
      <input
        name="new_password"
        type="password"
        placeholder="Mật khẩu mới"
        required
        minLength={6}
        className="w-28 rounded border border-slate-300 px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-gold-600 hover:bg-gold-700 disabled:opacity-60 text-white text-xs rounded px-2 py-1"
      >
        {pending ? "..." : "Lưu"}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state.success && <span className="text-xs text-emerald-600">Đã đổi ✓</span>}
    </form>
  );
}
