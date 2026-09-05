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
        className="input"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email đăng nhập"
        className="input"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Mật khẩu tạm"
        className="input"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Đã thêm giáo vụ.</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary"
      >
        {pending ? "Đang lưu..." : "Thêm"}
      </button>
    </form>
  );
}
