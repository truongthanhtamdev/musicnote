"use client";

import { useActionState, useRef, useEffect } from "react";
import { recordPaymentAction } from "@/actions/finance";
import type { FormState } from "@/actions/teachers";
import { todayISO } from "@/lib/format";

const initialState: FormState = {};

export default function NewPaymentForm({
  classes,
}: {
  classes: { id: number; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(recordPaymentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <select name="class_id" defaultValue="" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <option value="">Không gắn lớp cụ thể</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="amount"
          type="number"
          min="1"
          required
          placeholder="Số tiền (VNĐ)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="paid_at"
          type="date"
          required
          defaultValue={todayISO()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <input
        name="note"
        placeholder="Ghi chú (VD: đóng gói 20 tiết)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Đã ghi nhận thanh toán.</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        {pending ? "Đang lưu..." : "Ghi nhận thanh toán"}
      </button>
    </form>
  );
}
