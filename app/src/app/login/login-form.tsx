"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/actions/auth";
import { IconAlert } from "@/components/icons";
import { btn, field, label } from "@/components/ui";

const initialState: LoginState = {};

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className={label} htmlFor="login-email">
          Email hoặc số điện thoại
        </label>
        <input
          id="login-email"
          name="email"
          type="text"
          required
          autoFocus
          className={field}
          placeholder="ban@musicnote.local"
        />
      </div>
      <div>
        <label className={label} htmlFor="login-password">
          Mật khẩu
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          className={field}
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p className="text-sm text-coral-700 bg-coral-50 border border-coral-100 rounded-xl px-3 py-2 flex items-center gap-2">
          <IconAlert className="w-4 h-4 shrink-0" />
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${btn.primary} w-full py-3 text-base`}>
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>

    </form>
  );
}
