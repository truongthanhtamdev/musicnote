"use client";

import { useActionState, useRef, useEffect } from "react";
import { addExpenseAction } from "@/actions/finance";
import type { FormState } from "@/actions/teachers";
import { EXPENSE_CATEGORY_SUGGESTIONS } from "@/lib/types";
import { todayISO } from "@/lib/format";

const initialState: FormState = {};

export default function NewExpenseForm() {
  const [state, formAction, pending] = useActionState(addExpenseAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input
        name="category"
        list="expense-category-suggestions"
        required
        placeholder="Loại chi phí (VD: Quảng cáo (Ads))"
        defaultValue="Quảng cáo (Ads)"
        className="input"
      />
      <datalist id="expense-category-suggestions">
        {EXPENSE_CATEGORY_SUGGESTIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="amount"
          type="number"
          min="1"
          required
          placeholder="Số tiền (VNĐ)"
          className="input"
        />
        <input
          name="expense_date"
          type="date"
          required
          defaultValue={todayISO()}
          className="input"
        />
      </div>
      <input
        name="note"
        placeholder="Ghi chú (không bắt buộc)"
        className="input"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Đã thêm chi phí.</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        {pending ? "Đang lưu..." : "Thêm chi phí"}
      </button>
    </form>
  );
}
