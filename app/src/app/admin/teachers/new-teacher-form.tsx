"use client";

import { useActionState, useRef, useEffect } from "react";
import { createTeacherAction, type FormState } from "@/actions/teachers";
import { SUBJECT_SUGGESTIONS } from "@/lib/types";

const initialState: FormState = {};

export default function NewTeacherForm() {
  const [state, formAction, pending] = useActionState(createTeacherAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          name="name"
          required
          placeholder="Họ tên"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm col-span-2"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email đăng nhập"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm col-span-2"
        />
        <input
          name="phone"
          placeholder="Số điện thoại"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="pay_per_session"
          type="number"
          min={0}
          placeholder="Lương/buổi (VNĐ)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Mật khẩu tạm"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm col-span-2"
        />
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Ngôn ngữ dạy được</label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="languages" value="vi" defaultChecked /> Tiếng Việt
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="languages" value="en" /> Tiếng Anh
            </label>
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Chuyên môn (chọn được nhiều môn)</label>
          <div className="flex flex-wrap gap-4 text-sm">
            {SUBJECT_SUGGESTIONS.map((s) => (
              <label key={s} className="flex items-center gap-1.5">
                <input type="checkbox" name="subjects" value={s} /> {s}
              </label>
            ))}
          </div>
          <input
            name="subjects_other"
            placeholder="Môn khác (nếu có, cách nhau bởi dấu phẩy)"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Đã thêm giáo viên.</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-gold-600 hover:bg-gold-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        {pending ? "Đang lưu..." : "Thêm giáo viên"}
      </button>
    </form>
  );
}
