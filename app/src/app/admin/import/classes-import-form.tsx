"use client";

import { useActionState, useRef } from "react";
import { importClassesAction, type ImportState } from "@/actions/import";

const initialState: ImportState = {};

export default function ClassesImportForm() {
  const [state, formAction, pending] = useActionState(importClassesAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <p className="text-xs text-ink-500">
        Cột theo thứ tự:{" "}
        <code>
          TenHocSinh,SDT,PhuHuynh,TrinhDo,MonHoc,NgonNgu,Thu,GioBatDau,ThoiLuongPhut,EmailGiaoVien,GhiChu
        </code>{" "}
        (dòng đầu là tiêu đề). PhuHuynh (tên người đóng tiền) để trống nếu học viên tự đóng.
        MonHoc mặc định &quot;Guitar&quot; nếu để trống. NgonNgu là{" "}
        <code>vi</code> hoặc <code>en</code> (mặc định <code>vi</code>). Thu nhận T2..T7 hoặc CN.
        GioBatDau dạng HH:MM (VD 19:00). EmailGiaoVien để trống nếu lớp chưa xếp giáo viên.
      </p>
      <input
        type="file"
        name="file"
        accept=".csv,text/csv"
        required
        className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ivory-200 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-navy-100"
      />
      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
      {state.summary && (
        <pre className="text-xs bg-ivory-100 border border-navy-100 rounded-lg p-3 whitespace-pre-wrap text-ink-700 max-h-64 overflow-y-auto">
          {state.summary}
        </pre>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-wood-500 hover:bg-wood-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        {pending ? "Đang nhập..." : "Nhập lớp học"}
      </button>
    </form>
  );
}
