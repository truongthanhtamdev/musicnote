"use client";

import { useActionState, useState } from "react";
import { changeOwnPasswordAction, type FormState } from "@/actions/account";
import { IconAlert, IconCheck } from "@/components/icons";
import { btn, field, label } from "@/components/ui";

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
    <form key={formKey} action={formAction} className="space-y-4">
      <div>
        <label className={label} htmlFor="cp-current">
          Mật khẩu hiện tại
        </label>
        <input
          id="cp-current"
          name="current_password"
          type="password"
          required
          className={field}
          placeholder="••••••••"
        />
      </div>
      <div>
        <label className={label} htmlFor="cp-new">
          Mật khẩu mới
        </label>
        <input
          id="cp-new"
          name="new_password"
          type="password"
          required
          minLength={6}
          className={field}
          placeholder="Ít nhất 6 ký tự"
        />
      </div>
      <div>
        <label className={label} htmlFor="cp-confirm">
          Xác nhận mật khẩu mới
        </label>
        <input
          id="cp-confirm"
          name="confirm_password"
          type="password"
          required
          minLength={6}
          className={field}
          placeholder="Nhập lại mật khẩu mới"
        />
      </div>

      {state.error && (
        <p className="text-sm text-coral-700 bg-coral-50 border border-coral-100 rounded-xl px-3 py-2 flex items-center gap-2">
          <IconAlert className="w-4 h-4 shrink-0" />
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-mint-700 bg-mint-50 border border-mint-100 rounded-xl px-3 py-2 flex items-center gap-2">
          <IconCheck className="w-4 h-4 shrink-0" />
          Đã đổi mật khẩu thành công.
        </p>
      )}

      <button type="submit" disabled={pending} className={`${btn.primary} w-full py-3 text-base`}>
        {pending ? "Đang lưu..." : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
