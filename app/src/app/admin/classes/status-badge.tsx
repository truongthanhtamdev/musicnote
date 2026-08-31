import { CLASS_STATUS_LABELS, type ClassStatus } from "@/lib/types";

const STYLES: Record<ClassStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  ended: "bg-slate-100 text-slate-500",
};

export default function ClassStatusBadge({ status }: { status: ClassStatus }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STYLES[status]}`}>
      {CLASS_STATUS_LABELS[status]}
    </span>
  );
}
