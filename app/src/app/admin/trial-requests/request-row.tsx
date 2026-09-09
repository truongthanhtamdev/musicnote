"use client";

import { useTransition } from "react";
import { deleteTrialRequestAction, setTrialRequestStatusAction } from "@/actions/trial";
import {
  LANGUAGE_LABELS,
  TRIAL_REQUEST_STATUS_LABELS,
  type TrialRequestRow,
  type TrialRequestStatus,
} from "@/lib/types";
import { StatusChip } from "@/components/ui";

const TONE: Record<TrialRequestStatus, "coral" | "amber" | "mint" | "neutral"> = {
  new: "coral",
  contacted: "amber",
  done: "mint",
  cancelled: "neutral",
};

export default function RequestRow({ request }: { request: TrialRequestRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className={request.status === "new" ? "bg-coral-50/40" : "hover:bg-ivory-50"}>
      <td className="px-4 py-3">
        <p className="font-medium text-ink-900">{request.name}</p>
        <p className="text-xs text-ink-400 tabular">{request.created_at.slice(0, 16)}</p>
      </td>
      <td className="px-4 py-3">
        <a
          href={`tel:${request.phone.replace(/[^0-9+]/g, "")}`}
          className="font-medium text-navy-600 hover:underline tabular whitespace-nowrap"
        >
          {request.phone}
        </a>
        {request.contact && (
          <p className="text-xs text-ink-500 truncate max-w-[220px]">{request.contact}</p>
        )}
      </td>
      <td className="px-4 py-3 text-ink-700 whitespace-nowrap">
        {request.subject}
        <span className="block text-xs text-ink-400">{LANGUAGE_LABELS[request.language]}</span>
      </td>
      <td className="px-4 py-3 text-ink-600 text-sm max-w-[280px]">{request.note || "–"}</td>
      <td className="px-4 py-3">
        <StatusChip tone={TONE[request.status]}>
          {TRIAL_REQUEST_STATUS_LABELS[request.status]}
        </StatusChip>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          <select
            value={request.status}
            disabled={isPending}
            onChange={(e) =>
              startTransition(() =>
                setTrialRequestStatusAction(request.id, e.target.value as TrialRequestStatus)
              )
            }
            aria-label={`Trạng thái của ${request.name}`}
            className="rounded-lg border border-navy-200 px-2 py-1.5 text-sm"
          >
            {Object.entries(TRIAL_REQUEST_STATUS_LABELS).map(([value, textLabel]) => (
              <option key={value} value={value}>
                {textLabel}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(`Xoá đăng ký của ${request.name}?`)) {
                startTransition(() => deleteTrialRequestAction(request.id));
              }
            }}
            className="text-xs text-coral-600 hover:underline disabled:opacity-60"
          >
            Xoá
          </button>
        </div>
      </td>
    </tr>
  );
}
