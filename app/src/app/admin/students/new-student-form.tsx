"use client";

import { useActionState, useRef, useEffect } from "react";
import { createStudentAction } from "@/actions/students";
import type { FormState } from "@/actions/teachers";

const initialState: FormState = {};

export default function NewStudentForm() {
  const [state, formAction, pending] = useActionState(createStudentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input
        name="name"
        required
        placeholder="Họ tên học viên"
        className="input"
      />
      <input
        name="email"
        required
        placeholder="Email hoặc SĐT dùng để đăng nhập"
        className="input"
      />
      <input
        name="phone"
        placeholder="Số điện thoại liên hệ (không bắt buộc)"
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
      {state.success && <p className="text-sm text-emerald-600">Đã thêm học viên.</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary"
      >
        {pending ? "Đang lưu..." : "Thêm học viên"}
      </button>
    </form>
  );
}
