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
        <label className="label">Họ tên</label>
        <input
          name="name"
          defaultValue={teacher.name}
          required
          className="input"
        />
      </div>
      <div>
        <label className="label">Số điện thoại</label>
        <input
          name="phone"
          defaultValue={teacher.phone || ""}
          className="input"
        />
      </div>
      <div>
        <label className="label">Lương/buổi (VNĐ)</label>
        <input
          name="pay_per_session"
          type="number"
          min={0}
          defaultValue={teacher.pay_per_session || ""}
          className="input"
        />
      </div>
      <div>
        <label className="label">Ngôn ngữ dạy được</label>
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
        className="btn btn-primary"
      >
        {pending ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  );
}
