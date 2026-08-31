"use client";

import { useActionState, useState } from "react";
import { changeOwnPasswordAction, type FormState } from "@/actions/account";

const initialState: FormState = {};

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeOwnPasswordAction, initialState);
  const [formKey, setFormKey] = useState(0);
  const [handledState, setHandledState] = useState(state);

  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setFormKey((k) => k + 1);
  }

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Mật khẩu hiện tại</label>
        <input
          name="current_password"
          type="password"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Mật khẩu mới</label>
        <input
          name="new_password"
          type="password"
          required
          minLength={6}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Xác nhận mật khẩu mới</label>
        <input
          name="confirm_password"
          type="password"
          required
          minLength={6}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Đã đổi mật khẩu thành công.</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-gold-600 hover:bg-gold-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        {pending ? "Đang lưu..." : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
