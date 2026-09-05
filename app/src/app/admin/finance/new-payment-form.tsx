"use client";

import { useActionState, useState } from "react";
import { recordPaymentAction } from "@/actions/finance";
import type { FormState } from "@/actions/teachers";
import { getSuggestedPackagePrice } from "@/lib/types";
import { todayISO } from "@/lib/format";

const initialState: FormState = {};

export default function NewPaymentForm({
  classes,
}: {
  classes: { id: number; label: string; subject: string; packageTotal: number | null }[];
}) {
  const [state, formAction, pending] = useActionState(recordPaymentAction, initialState);
  const [amount, setAmount] = useState("");
  const [formKey, setFormKey] = useState(0);

  // Remount the form (via key) once a save succeeds, resetting all fields —
  // adjusting state during render (rather than in an effect) avoids an
  // extra commit-then-rerender pass, and a ref reset can't run during render.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setAmount("");
      setFormKey((k) => k + 1);
    }
  }

  function handleClassChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const cls = classes.find((c) => c.id === Number(e.target.value));
    if (cls?.packageTotal) {
      const suggested = getSuggestedPackagePrice(cls.subject, cls.packageTotal);
      if (suggested) setAmount(String(suggested));
    }
  }

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      <select
        name="class_id"
        defaultValue=""
        onChange={handleClassChange}
        className="input"
      >
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
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input"
        />
        <input
          name="paid_at"
          type="date"
          required
          defaultValue={todayISO()}
          className="input"
        />
      </div>
      <p className="text-xs text-slate-400 -mt-1">
        Số tiền tự điền theo giá gói (Guitar 20t: 7.5tr, 50t: 15tr · Piano/Violin/Thanh nhạc 20t:
        8tr, 50t: 16tr) — sửa lại nếu giá khác.
      </p>
      <input
        name="note"
        placeholder="Ghi chú (VD: đóng gói 20 tiết)"
        className="input"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Đã ghi nhận thanh toán.</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary"
      >
        {pending ? "Đang lưu..." : "Ghi nhận thanh toán"}
      </button>
    </form>
  );
}
