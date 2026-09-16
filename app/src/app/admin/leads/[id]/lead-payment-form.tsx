"use client";

import { useActionState, useState } from "react";
import { recordLeadPaymentAction } from "@/actions/leads";
import type { FormState } from "@/actions/teachers";
import { vnToday } from "@/lib/time";

const initialState: FormState = {};

export default function LeadPaymentForm({
  leadId,
  classId,
}: {
  leadId: number;
  /** Dữ liệu cũ có thể còn gắn với một lớp học; giữ lại để sổ sách khớp. */
  classId: number | null;
}) {
  const [state, formAction, pending] = useActionState(recordLeadPaymentAction, initialState);
  const [formKey, setFormKey] = useState(0);

  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.success) setFormKey((k) => k + 1);
  }

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      <input type="hidden" name="lead_id" value={leadId} />
      {classId && <input type="hidden" name="class_id" value={classId} />}
      <div className="grid grid-cols-2 gap-3">
        <input name="amount" inputMode="numeric" required placeholder="Số tiền (VNĐ)" className="input" />
        <input type="date" name="paid_at" required defaultValue={vnToday()} className="input" />
      </div>
      <input name="note" placeholder="Ghi chú (VD: đóng gói 20 buổi)" className="input" />
      {state.error && <p className="text-[13px] text-rose-600">{state.error}</p>}
      {state.success && <p className="text-[13px] text-brand-600">Đã ghi nhận thanh toán.</p>}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Đang lưu..." : "Ghi nhận thanh toán"}
      </button>
    </form>
  );
}
