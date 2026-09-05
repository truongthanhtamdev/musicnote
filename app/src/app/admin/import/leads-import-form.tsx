"use client";

import { useActionState } from "react";
import { importLeadsAction, type ImportState } from "@/actions/import";

const initialState: ImportState = {};

export default function LeadsImportForm() {
  const [state, formAction, pending] = useActionState(importLeadsAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-xs text-slate-500">
        Cột theo thứ tự:{" "}
        <code>Ten,SDT,TenFacebook,LinkFacebook,KhuVuc,MonHoc,HinhThucHoc,NhuCau,Nguon,NgayNhan,GhiChu</code>{" "}
        (dòng đầu là tiêu đề). HinhThucHoc nhận chữ tiếng Việt: &quot;tại nhà&quot;,
        &quot;online&quot;, &quot;quán cà phê&quot;, &quot;trung tâm&quot;. NgayNhan dạng
        YYYY-MM-DD, để trống thì lấy ngày hôm nay. Dòng trùng SĐT với khách đã có sẵn sẽ được bỏ
        qua.
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
        <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap text-slate-700 max-h-64 overflow-y-auto">
          {state.summary}
        </pre>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary"
      >
        {pending ? "Đang nhập..." : "Nhập khách hàng tiềm năng"}
      </button>
    </form>
  );
}
