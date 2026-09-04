import {
  LEAD_STATUS_LABELS,
  LEAD_TEMPERATURE_LABELS,
  type LeadStatus,
  type LeadTemperature,
} from "@/lib/types";

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-sky-50 text-sky-700",
  contacted: "bg-indigo-50 text-indigo-700",
  consulting: "bg-violet-50 text-violet-700",
  trial_scheduled: "bg-amber-50 text-amber-700",
  trial_done: "bg-orange-50 text-orange-700",
  won: "bg-emerald-50 text-emerald-700",
  lost: "bg-red-50 text-red-700",
  cold: "bg-slate-100 text-slate-600",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[status]}`}>
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

const TEMPERATURE_STYLES: Record<LeadTemperature, string> = {
  hot: "bg-red-50 text-red-600",
  warm: "bg-amber-50 text-amber-700",
  cold: "bg-slate-100 text-slate-500",
};

export function LeadTemperatureBadge({ temperature }: { temperature: LeadTemperature }) {
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${TEMPERATURE_STYLES[temperature]}`}>
      {LEAD_TEMPERATURE_LABELS[temperature]}
    </span>
  );
}
