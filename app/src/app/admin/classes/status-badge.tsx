const LABELS: Record<string, { text: string; className: string }> = {
  active: { text: "Đang học", className: "bg-emerald-50 text-emerald-700" },
  paused: { text: "Tạm dừng", className: "bg-amber-50 text-amber-700" },
  ended: { text: "Đã kết thúc", className: "bg-slate-100 text-slate-500" },
};

export default function ClassStatusBadge({ status }: { status: string }) {
  const info = LABELS[status] || LABELS.active;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${info.className}`}>
      {info.text}
    </span>
  );
}
