"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/actions/auth";

const initialState: LoginState = {};

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label">Email hoặc SĐT</label>
        <input
          name="email"
          type="text"
          required
          autoFocus
          className="input"
          placeholder="ban@musicnote.local"
        />
      </div>
      <div>
        <label className="label">Mật khẩu</label>
        <input
          name="password"
          type="password"
          required
          className="input"
          placeholder="••••••••"
        />
      </div>
      {state.error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full justify-center"
      >
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
      <div className="space-y-0.5 border-t border-line-soft pt-3 text-[11.5px] text-muted">
        <p>Tài khoản admin mặc định: admin@musicnote.local / admin123</p>
        <p>Đổi mật khẩu này ngay sau khi đăng nhập lần đầu.</p>
      </div>
    </form>
  );
}
