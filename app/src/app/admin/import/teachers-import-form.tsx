"use client";

import { useActionState, useRef } from "react";
import { importTeachersAction, type ImportState } from "@/actions/import";

const initialState: ImportState = {};

export default function TeachersImportForm() {
  const [state, formAction, pending] = useActionState(importTeachersAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <p className="text-xs text-slate-500">
        Cột theo thứ tự: <code>Ten,Email,SDT,LuongMoiBuoi,NgonNgu,MatKhau</code> (dòng đầu là tiêu
        đề). NgonNgu là <code>vi</code>, <code>en</code>, hoặc <code>vi,en</code> (mặc định{" "}
        <code>vi</code>). Để trống MatKhau để hệ thống tự sinh mật khẩu tạm.
      </p>
      <input
        type="file"
        name="file"
        accept=".csv,text/csv"
        required
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.summary && (
        <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap text-slate-700">
          {state.summary}
        </pre>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        {pending ? "Đang nhập..." : "Nhập giáo viên"}
      </button>
    </form>
  );
}
