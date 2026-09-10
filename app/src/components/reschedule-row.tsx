"use client";

import { useActionState, useState } from "react";
import { respondRescheduleAction } from "@/actions/reschedule";
import type { FormState } from "@/actions/teachers";
import type { RescheduleRequestWithContext } from "@/lib/queries";
import { DAY_LABELS, RESCHEDULE_STATUS_LABELS, formatPayerLabel } from "@/lib/types";
import { Avatar, StatusChip, btn, field, inlineAction, type ChipTone } from "./ui";

const initialState: FormState = {};

const STATUS_TONE: Record<string, ChipTone> = {
  pending: "amber",
  approved: "mint",
  declined: "coral",
  cancelled: "neutral",
};

function When({ date, time }: { date: string; time?: string }) {
  const day = DAY_LABELS[new Date(`${date}T00:00:00`).getDay()];
  return (
    <span className="tabular whitespace-nowrap">
      {day} {date}
      {time ? ` · ${time}` : ""}
    </span>
  );
}

/** Một dòng yêu cầu dời lịch, dùng chung cho trang giáo viên và trang giáo vụ. */
export default function RescheduleRow({ request }: { request: RescheduleRequestWithContext }) {
  const [state, formAction, pending] = useActionState(respondRescheduleAction, initialState);
  const [declining, setDeclining] = useState(false);

  return (
    <tr className="hover:bg-ivory-50 align-top">
      <td className="px-2.5 sm:px-4 py-3">
        <span className="flex items-center gap-2 font-medium text-ink-900">
          <Avatar name={request.student_name} className="w-7 h-7 text-[10px]" />
          <span className="min-w-0">
            <span className="block truncate">{formatPayerLabel(request)}</span>
            <span className="block text-xs text-ink-500">
              {request.subject}
              {request.teacher_name ? ` · GV ${request.teacher_name}` : ""}
            </span>
          </span>
        </span>
      </td>
      <td className="px-2.5 sm:px-4 py-3 text-ink-700">
        <When date={request.session_date} />
      </td>
      <td className="px-2.5 sm:px-4 py-3 font-medium text-ink-900">
        <When date={request.to_date} time={request.to_time} />
      </td>
      <td className="px-2.5 sm:px-4 py-3 text-ink-600 max-w-[200px] hidden sm:table-cell">
        <span className="block truncate" title={request.reason || undefined}>
          {request.reason || "–"}
        </span>
      </td>
      <td className="px-2.5 sm:px-4 py-3">
        <StatusChip tone={STATUS_TONE[request.status] ?? "neutral"}>
          {RESCHEDULE_STATUS_LABELS[request.status]}
        </StatusChip>
        {request.response_note && (
          <span className="block text-xs text-ink-500 mt-1">{request.response_note}</span>
        )}
        {state.error && <span className="block text-xs text-coral-600 mt-1">{state.error}</span>}
      </td>
      <td className="px-2.5 sm:px-4 py-3 text-right">
        {request.status !== "pending" ? (
          <span className="text-sm text-ink-400">–</span>
        ) : declining ? (
          <form action={formAction} className="flex flex-wrap justify-end gap-2">
            <input type="hidden" name="id" value={request.id} />
            <input type="hidden" name="decision" value="decline" />
            <input
              name="response_note"
              placeholder="Lý do (không bắt buộc)"
              className={`${field} w-auto min-w-[160px] py-1.5`}
            />
            <button type="submit" disabled={pending} className={`${btn.danger} py-1.5`}>
              {pending ? "..." : "Gửi từ chối"}
            </button>
            <button type="button" onClick={() => setDeclining(false)} className={btn.ghost}>
              Huỷ
            </button>
          </form>
        ) : (
          <div className="flex justify-end gap-3">
            <form action={formAction}>
              <input type="hidden" name="id" value={request.id} />
              <input type="hidden" name="decision" value="approve" />
              <button
                type="submit"
                disabled={pending}
                className={`${inlineAction} text-mint-700 hover:text-mint-800 font-semibold text-sm`}
              >
                {pending ? "..." : "Duyệt"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setDeclining(true)}
              className={`${inlineAction} text-coral-600 hover:text-coral-700 font-semibold text-sm`}
            >
              Từ chối
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
