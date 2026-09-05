import {
  LEAD_STATUS_LABELS,
  LEAD_TEMPERATURE_LABELS,
  type LeadStatus,
  type LeadTemperature,
} from "@/lib/types";

/** Cùng bộ màu với thanh phễu ở trang báo cáo, để nhìn màu là nhận ra bước. */
const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-slate-100 text-slate-600",
  contacted: "bg-amber-50 text-amber-700",
  consulting: "bg-indigo-50 text-indigo-700",
  trial_scheduled: "bg-violet-50 text-violet-700",
  trial_done: "bg-orange-50 text-orange-700",
  won: "bg-brand-50 text-brand-700",
  lost: "bg-rose-50 text-rose-700",
  cold: "bg-slate-100 text-slate-500",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`badge ${STATUS_STYLES[status]}`}>{LEAD_STATUS_LABELS[status]}</span>;
}

const TEMPERATURE_STYLES: Record<LeadTemperature, string> = {
  hot: "bg-rose-50 text-rose-600",
  warm: "bg-amber-50 text-amber-700",
  cold: "bg-slate-100 text-slate-500",
};

export function LeadTemperatureBadge({ temperature }: { temperature: LeadTemperature }) {
  return (
    <span className={`badge ${TEMPERATURE_STYLES[temperature]}`}>
      {LEAD_TEMPERATURE_LABELS[temperature]}
    </span>
  );
}
