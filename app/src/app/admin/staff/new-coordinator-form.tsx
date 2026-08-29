"use client";

import { useActionState, useRef, useEffect } from "react";
import { createCoordinatorAction } from "@/actions/teachers";
import type { FormState } from "@/actions/teachers";

const initialState: FormState = {};

export default function NewCoordinatorForm() {
  const [state, formAction, pending] = useActionState(createCoordinatorAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input
        name="name"
        required
        placeholder="Họ tên"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email đăng nhập"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Mật khẩu tạm"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Đã thêm quản lý ca.</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        {pending ? "Đang lưu..." : "Thêm"}
      </button>
    </form>
  );
}
