"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLeadAction, setLeadStatusAction } from "@/actions/leads";
import {
  LEAD_LOST_REASON_SUGGESTIONS,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/types";

/** Các bước chăm sóc bấm nhanh; "Đã chốt" không có ở đây vì phải qua bước tạo lớp. */
const QUICK_STEPS: LeadStatus[] = ["new", "contacted", "consulting", "trial_scheduled", "trial_done"];

export default function LeadStatusActions({
  leadId,
  status,
  canDelete,
}: {
  leadId: number;
  status: LeadStatus;
  canDelete: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_STEPS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={isPending || status === s}
            onClick={() => startTransition(() => setLeadStatusAction(leadId, s))}
            className={`text-sm rounded-lg px-3 py-1.5 border transition disabled:opacity-60 ${
              status === s
                ? "border-gold-300 bg-gold-50 text-gold-700 font-medium"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {LEAD_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Lý do không chốt...</option>
          {LEAD_LOST_REASON_SUGGESTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={isPending || status === "cold"}
          onClick={() => startTransition(() => setLeadStatusAction(leadId, "cold", reason))}
          className="text-sm border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg px-3 py-1.5 disabled:opacity-60"
        >
          Đánh dấu nguội
        </button>
        <button
          type="button"
          disabled={isPending || status === "lost"}
          onClick={() => startTransition(() => setLeadStatusAction(leadId, "lost", reason))}
          className="text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-lg px-3 py-1.5 disabled:opacity-60"
        >
          Từ chối
        </button>
        {canDelete && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!confirm("Xoá hẳn khách hàng này khỏi danh sách?")) return;
              startTransition(async () => {
                await deleteLeadAction(leadId);
                router.push("/admin/leads");
              });
            }}
            className="text-sm text-slate-400 hover:text-red-600 px-2 py-1.5 ml-auto"
          >
            Xoá
          </button>
        )}
      </div>
    </div>
  );
}
