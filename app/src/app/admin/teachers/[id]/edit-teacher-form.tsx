"use client";

import { useActionState } from "react";
import { updateTeacherAction, type FormState } from "@/actions/teachers";
import { parseLanguages, type UserRow } from "@/lib/types";

const initialState: FormState = {};

export default function EditTeacherForm({ teacher }: { teacher: UserRow }) {
  const [state, formAction, pending] = useActionState(updateTeacherAction, initialState);
  const langs = parseLanguages(teacher.languages);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={teacher.id} />
      <div>
        <label className="block text-xs text-slate-500 mb-1">Họ tên</label>
        <input
          name="name"
          defaultValue={teacher.name}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Số điện thoại</label>
        <input
          name="phone"
          defaultValue={teacher.phone || ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Lương/buổi (VNĐ)</label>
        <input
          name="pay_per_session"
          type="number"
          min={0}
          defaultValue={teacher.pay_per_session || ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Ngôn ngữ dạy được</label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="languages" value="vi" defaultChecked={langs.includes("vi")} /> Tiếng Việt
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="languages" value="en" defaultChecked={langs.includes("en")} /> Tiếng Anh
          </label>
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Đã lưu thay đổi.</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-gold-600 hover:bg-gold-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        {pending ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  );
}
