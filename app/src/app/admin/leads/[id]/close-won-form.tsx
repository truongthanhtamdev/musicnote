"use client";

import { useActionState } from "react";
import { closeLeadWonAction } from "@/actions/leads";
import type { FormState } from "@/actions/teachers";
import { vnToday } from "@/lib/time";

const initialState: FormState = {};

export default function CloseWonForm({ leadId }: { leadId: number }) {
  const [state, formAction, pending] = useActionState(closeLeadWonAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label">Học phí thu lần này (VNĐ)</label>
          <input
            name="amount"
            inputMode="numeric"
            placeholder="Bỏ trống nếu chưa thu"
            className="input"
          />
        </div>
        <div>
          <label className="label">Ngày thu</label>
          <input type="date" name="paid_at" defaultValue={vnToday()} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Ghi chú</label>
        <input name="note" placeholder="VD: đóng trước gói 20 buổi" className="input" />
      </div>
      {state.error && <p className="text-[13px] text-rose-600">{state.error}</p>}
      {state.success && <p className="text-[13px] text-brand-600">Đã chốt khách.</p>}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Đang lưu..." : "Chốt khách"}
      </button>
    </form>
  );
}
