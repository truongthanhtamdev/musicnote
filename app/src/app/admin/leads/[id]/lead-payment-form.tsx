"use client";

import { useActionState, useState } from "react";
import { recordLeadPaymentAction } from "@/actions/leads";
import type { FormState } from "@/actions/teachers";
import { todayISO } from "@/lib/format";
import { getSuggestedPackagePrice } from "@/lib/types";

const initialState: FormState = {};
const inputClass = "input";

export default function LeadPaymentForm({
  leadId,
  classId,
  subject,
  packageTotal,
}: {
  leadId: number;
  classId: number;
  subject: string;
  packageTotal: number | null;
}) {
  const suggested = packageTotal ? getSuggestedPackagePrice(subject, packageTotal) : null;
  const [state, formAction, pending] = useActionState(recordLeadPaymentAction, initialState);
  const [formKey, setFormKey] = useState(0);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setFormKey((k) => k + 1);
  }

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="class_id" value={classId} />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="amount"
          inputMode="numeric"
          required
          placeholder="Số tiền (VNĐ)"
          defaultValue={suggested ? String(suggested) : ""}
          className={inputClass}
        />
        <input type="date" name="paid_at" required defaultValue={todayISO()} className={inputClass} />
      </div>
      <input name="note" placeholder="Ghi chú (VD: đóng gói 20 tiết)" className={inputClass} />
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
