"use client";

import { useActionState, useState } from "react";
import { updatePaymentAction } from "@/actions/finance";
import type { FormState } from "@/actions/teachers";
import { formatVND } from "@/lib/format";
import DeletePaymentButton from "./delete-payment-button";

const initialState: FormState = {};

export interface PaymentRowData {
  id: number;
  amount: number;
  paid_at: string;
  note: string | null;
  class_id: number | null;
  /** Tên hiển thị của lớp gắn với khoản thu, đã gộp sẵn khách hàng + học viên. */
  label: string;
}

export default function PaymentRow({
  payment,
  classes,
}: {
  payment: PaymentRowData;
  classes: { id: number; label: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updatePaymentAction, initialState);

  // Đóng ô sửa ngay khi server báo lưu xong — chỉnh state trong lúc render
  // thay vì dùng effect, đỡ một vòng render thừa.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setEditing(false);
  }

  if (editing) {
    return (
      <form action={formAction} className="px-5 py-3 space-y-2 bg-ivory-50">
        <input type="hidden" name="id" value={payment.id} />
        <select
          name="class_id"
          defaultValue={payment.class_id ?? ""}
          aria-label="Lớp học"
          className="w-full rounded-lg border border-navy-200 px-2 py-1.5 text-sm"
        >
          <option value="">Không gắn lớp cụ thể</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            name="amount"
            type="number"
            min="1"
            required
            defaultValue={payment.amount}
            aria-label="Số tiền"
            className="rounded-lg border border-navy-200 px-2 py-1.5 text-sm tabular"
          />
          <input
            name="paid_at"
            type="date"
            required
            defaultValue={payment.paid_at}
            aria-label="Ngày thu"
            className="rounded-lg border border-navy-200 px-2 py-1.5 text-sm"
          />
        </div>
        <input
          name="note"
          defaultValue={payment.note || ""}
          placeholder="Ghi chú"
          aria-label="Ghi chú"
          className="w-full rounded-lg border border-navy-200 px-2 py-1.5 text-sm"
        />
        {state.error && <p className="text-xs text-coral-600">{state.error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="bg-wood-500 hover:bg-wood-600 disabled:opacity-60 text-white text-xs font-medium rounded-lg px-3 py-1.5"
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
        <p className="font-semibold text-ink-900 tabular">{formatVND(payment.amount)}</p>
        <p className="text-ink-500 text-xs truncate">
          {payment.paid_at} · {payment.label}
          {payment.note ? ` · ${payment.note}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-wood-600 hover:underline"
        >
          Sửa
        </button>
        <DeletePaymentButton id={payment.id} />
      </div>
    </div>
  );
}
