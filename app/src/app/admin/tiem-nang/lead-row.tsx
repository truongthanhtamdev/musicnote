"use client";

import { useState } from "react";
import {
  deleteLeadAction,
  leadToTrialRequestAction,
  setLeadStageAction,
  snoozeLeadAction,
} from "@/actions/leads";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  LEAD_STAGE_TONE,
  type LeadRow as Lead,
} from "@/lib/lead-types";
import LeadForm from "./lead-form";

/** Ngày hẹn so với hôm nay, để tô màu và ghi chữ cho dễ đọc. */
function followUpInfo(date: string | null, todayISO: string) {
  if (!date) return { text: "Chưa hẹn", tone: "text-ink-400", urgent: false };
  const days = Math.round(
    (new Date(`${date}T00:00:00`).getTime() - new Date(`${todayISO}T00:00:00`).getTime()) / 86_400_000
  );
  const [, m, d] = date.split("-");
  const short = `${d}/${m}`;
  if (days < 0) return { text: `Quá hạn ${-days} ngày (${short})`, tone: "text-coral-700 font-semibold", urgent: true };
  if (days === 0) return { text: `Hôm nay (${short})`, tone: "text-coral-700 font-semibold", urgent: true };
  if (days === 1) return { text: `Ngày mai (${short})`, tone: "text-amber-700 font-medium", urgent: false };
  return { text: `${short} · còn ${days} ngày`, tone: "text-ink-600", urgent: false };
}

export default function LeadRowItem({ lead, todayISO }: { lead: Lead; todayISO: string }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fu = followUpInfo(lead.next_follow_up, todayISO);
  const done = lead.stage === "won" || lead.stage === "lost";

  return (
    <tr className={`border-t border-navy-100 align-top ${done ? "opacity-60" : ""}`}>
      <td className="px-4 py-3 min-w-[160px]">
        <p className="font-semibold text-ink-900">{lead.name}</p>
        <div className="text-xs text-ink-500 mt-0.5 space-y-0.5">
          {lead.phone && <p className="tabular">{lead.phone}</p>}
          {lead.facebook_url && (
            <a
              href={lead.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-wood-600 hover:text-wood-700 underline underline-offset-2 block"
            >
              Mở Facebook
            </a>
          )}
          {lead.source && <p className="text-ink-400">{lead.source}</p>}
        </div>
      </td>

      <td className="px-4 py-3 text-sm text-ink-700 whitespace-nowrap">{lead.subject ?? "—"}</td>

      <td className="px-4 py-3 max-w-xs">
        <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-line">
          {lead.note ?? <span className="text-ink-300">Chưa ghi gì</span>}
        </p>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <form action={snoozeLeadAction.bind(null, lead.id, "")} className="contents">
          <p className={`text-sm ${fu.tone}`}>{fu.text}</p>
        </form>
        <input
          type="date"
          defaultValue={lead.next_follow_up ?? ""}
          aria-label={`Hẹn liên hệ lại với ${lead.name}`}
          onChange={(e) => snoozeLeadAction(lead.id, e.target.value)}
          className="mt-1 rounded-lg border border-navy-200 bg-white px-2 py-1 text-xs"
        />
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <select
          value={lead.stage}
          aria-label={`Giai đoạn của ${lead.name}`}
          onChange={(e) => setLeadStageAction(lead.id, e.target.value)}
          className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${LEAD_STAGE_TONE[lead.stage]}`}
        >
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        {lead.coordinator_name && (
          <p className="text-xs text-ink-400 mt-1">GV: {lead.coordinator_name}</p>
        )}
      </td>

      <td className="px-4 py-3 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1">
          {lead.stage !== "trial_booked" && !done && (
            <form action={leadToTrialRequestAction.bind(null, lead.id)}>
              <button
                type="submit"
                className="text-xs font-semibold text-wood-700 hover:text-wood-800 px-2 py-1"
              >
                Đặt học thử
              </button>
            </form>
          )}
          <LeadForm lead={lead} />
          {confirmDelete ? (
            <form action={deleteLeadAction.bind(null, lead.id)} className="inline-flex items-center gap-1">
              <button type="submit" className="text-xs font-semibold text-coral-600 px-1.5 py-1">
                Xoá thật
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-ink-400 px-1"
              >
                Thôi
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-semibold text-ink-400 hover:text-coral-600 px-2 py-1"
            >
              Xoá
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
