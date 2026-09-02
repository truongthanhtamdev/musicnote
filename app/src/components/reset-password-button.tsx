"use client";

import { useActionState, useState } from "react";
import { adminResetPasswordAction, type FormState } from "@/actions/account";
import { IconKey } from "./icons";
import { btn, field } from "./ui";

const initialState: FormState = {};

export default function ResetPasswordButton({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(adminResetPasswordAction, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-wood-600 hover:text-wood-700"
      >
        <IconKey className="w-3.5 h-3.5" />
        Đặt lại mật khẩu
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <input
        name="new_password"
        type="password"
        placeholder="Mật khẩu mới"
        aria-label="Mật khẩu mới"
        required
        minLength={6}
        className={`${field} w-36 py-1.5 text-xs`}
      />
      <button type="submit" disabled={pending} className={`${btn.primary} px-3 py-1.5 text-xs`}>
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className={`${btn.ghost} px-2 py-1.5 text-xs`}>
        Huỷ
      </button>
      {state.error && <span className="text-xs text-coral-600 w-full text-right">{state.error}</span>}
      {state.success && (
        <span className="text-xs text-mint-600 w-full text-right">Đã đổi mật khẩu</span>
      )}
    </form>
  );
}
