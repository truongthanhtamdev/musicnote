"use client";

import { useActionState, useState } from "react";
import { inlineAction } from "@/components/ui";
import { updateExpenseAction } from "@/actions/finance";
import type { FormState } from "@/actions/teachers";
import { formatVND } from "@/lib/format";
import type { ExpenseRow as ExpenseRowType } from "@/lib/types";
import DeleteExpenseButton from "./delete-expense-button";

const initialState: FormState = {};

export default function ExpenseRow({ expense }: { expense: ExpenseRowType }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateExpenseAction, initialState);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setEditing(false);
  }

  if (editing) {
    return (
      <form action={formAction} className="px-5 py-3 space-y-2 bg-ivory-50">
        <input type="hidden" name="id" value={expense.id} />
        <input
          name="category"
          list="expense-category-suggestions"
          required
          defaultValue={expense.category}
          aria-label="Loại chi phí"
          className="w-full rounded-lg border border-navy-200 px-2 py-1.5 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            name="amount"
            type="number"
            min="1"
            required
            defaultValue={expense.amount}
            aria-label="Số tiền"
            className="rounded-lg border border-navy-200 px-2 py-1.5 text-sm tabular"
          />
          <input
            name="expense_date"
            type="date"
            required
            defaultValue={expense.expense_date}
            aria-label="Ngày chi"
            className="rounded-lg border border-navy-200 px-2 py-1.5 text-sm"
          />
        </div>
        <input
          name="note"
          defaultValue={expense.note || ""}
          placeholder="Ghi chú"
          aria-label="Ghi chú"
          className="w-full rounded-lg border border-navy-200 px-2 py-1.5 text-sm"
        />
        {state.error && <p className="text-xs text-coral-600">{state.error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="bg-navy-800 hover:bg-navy-900 disabled:opacity-60 text-white text-xs font-medium rounded-lg px-3 py-1.5"
          >
            {pending ? "Đang lưu..." : "Lưu"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-ink-500 hover:text-ink-900"
          >
            Huỷ
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="px-5 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-ink-900 tabular">{formatVND(expense.amount)}</p>
        <p className="text-ink-500 text-xs truncate">
          {expense.expense_date} · {expense.category}
          {expense.note ? ` · ${expense.note}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`${inlineAction} text-xs font-semibold text-wood-600 hover:underline`}
        >
          Sửa
        </button>
        <DeleteExpenseButton id={expense.id} />
      </div>
    </div>
  );
}
