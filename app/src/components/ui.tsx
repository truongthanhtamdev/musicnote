/**
 * Primitive dùng chung cho toàn hệ thống (server-safe, không state).
 * Nguyên tắc: trạng thái luôn có CHỮ đi kèm màu — không dựa vào màu đơn lẻ.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { IconChevronRight, IconFacebook } from "./icons";

/* ---------------------------------- Card --------------------------------- */

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`bg-white rounded-2xl border border-navy-100 shadow-[0_1px_2px_rgba(16,36,62,0.04)] ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  count,
  action,
  icon,
  tone = "default",
}: {
  title: string;
  count?: number | string;
  action?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-5 py-3.5 border-b ${
        tone === "warning" ? "border-coral-100 bg-coral-50/60" : "border-navy-100"
      }`}
    >
      <h2
        className={`font-semibold flex items-center gap-2 ${
          tone === "warning" ? "text-coral-700" : "text-ink-900"
        }`}
      >
        {icon}
        {title}
        {count !== undefined && (
          <span
            className={`text-xs font-semibold rounded-full px-2 py-0.5 tabular ${
              tone === "warning" ? "bg-coral-100 text-coral-700" : "bg-navy-50 text-navy-700"
            }`}
          >
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}

/* ------------------------------- Page header ------------------------------ */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-ink-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-ink-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------- Metric card ------------------------------ */

const METRIC_TONES = {
  navy: { icon: "bg-navy-50 text-navy-700", value: "text-ink-900" },
  mint: { icon: "bg-mint-50 text-mint-600", value: "text-ink-900" },
  amber: { icon: "bg-amber-50 text-amber-700", value: "text-ink-900" },
  coral: { icon: "bg-coral-50 text-coral-600", value: "text-ink-900" },
  wood: { icon: "bg-wood-50 text-wood-700", value: "text-ink-900" },
} as const;

export type MetricTone = keyof typeof METRIC_TONES;

export function MetricCard({
  label,
  value,
  unit,
  hint,
  icon,
  tone = "navy",
  href,
}: {
  label: string;
  value: number | string;
  unit?: string;
  hint?: string;
  icon?: ReactNode;
  tone?: MetricTone;
  href?: string;
}) {
  const t = METRIC_TONES[tone];
  const body = (
    <div className="bg-white rounded-2xl border border-navy-100 p-3.5 sm:p-4 flex items-start gap-2.5 sm:gap-3.5 h-full transition hover:border-wood-300 hover:shadow-[0_2px_10px_rgba(16,36,62,0.06)]">
      {icon && (
        <span className={`shrink-0 rounded-xl p-2 sm:p-2.5 ${t.icon}`} aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm text-ink-500 leading-snug">{label}</p>
        <p className={`text-2xl sm:text-3xl font-bold mt-0.5 tabular ${t.value}`}>
          {value}
          {unit && <span className="text-xs sm:text-sm font-medium text-ink-400 ml-1 sm:ml-1.5">{unit}</span>}
        </p>
        {hint && <p className="text-xs text-ink-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

/* ------------------------------- Status chip ------------------------------ */

const CHIP_TONES = {
  mint: "bg-mint-50 text-mint-700 border-mint-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  coral: "bg-coral-50 text-coral-700 border-coral-100",
  navy: "bg-navy-50 text-navy-700 border-navy-100",
  wood: "bg-wood-50 text-wood-700 border-wood-100",
  neutral: "bg-ivory-100 text-ink-500 border-ivory-200",
} as const;

export type ChipTone = keyof typeof CHIP_TONES;

export function StatusChip({
  children,
  tone = "neutral",
  icon,
  className = "",
}: {
  children: ReactNode;
  tone?: ChipTone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${CHIP_TONES[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

/* ------------------------------ Progress bar ------------------------------ */

/** Ngưỡng cảnh báo gói học: còn ≤3 buổi là coral, ≤5 buổi là amber. */
export function packageTone(remaining: number): ChipTone {
  if (remaining <= 3) return "coral";
  if (remaining <= 5) return "amber";
  return "mint";
}

const BAR_FILL: Record<ChipTone, string> = {
  mint: "bg-mint-500",
  amber: "bg-amber-500",
  coral: "bg-coral-500",
  navy: "bg-navy-700",
  wood: "bg-wood-500",
  neutral: "bg-ink-400",
};

export function ProgressBar({
  value,
  max,
  tone = "mint",
  showPercent = false,
  className = "",
}: {
  value: number;
  max: number;
  tone?: ChipTone;
  showPercent?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="flex-1 h-1.5 rounded-full bg-ivory-200 overflow-hidden min-w-[60px]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className={`h-full rounded-full ${BAR_FILL[tone]}`} style={{ width: `${pct}%` }} />
      </div>
      {showPercent && <span className="text-xs text-ink-500 tabular w-9 text-right">{pct}%</span>}
    </div>
  );
}

/* ------------------------------- Empty state ------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 py-12 text-center">
      {icon && (
        <span
          className="inline-flex rounded-2xl bg-ivory-100 text-ink-400 p-3 mb-3"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <p className="font-semibold text-ink-900">{title}</p>
      {description && <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* --------------------------------- Banner -------------------------------- */

export function Banner({
  tone = "amber",
  icon,
  title,
  children,
  action,
}: {
  tone?: "amber" | "coral" | "navy" | "mint";
  icon?: ReactNode;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const tones = {
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    coral: "bg-coral-50 border-coral-100 text-coral-700",
    navy: "bg-navy-50 border-navy-100 text-navy-800",
    mint: "bg-mint-50 border-mint-100 text-mint-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${tones[tone]}`}>
      {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
      <div className="text-sm min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* -------------------------------- Buttons -------------------------------- */

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 bg-wood-500 hover:bg-wood-600 disabled:opacity-60 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition",
  secondary:
    "inline-flex items-center justify-center gap-2 bg-white hover:bg-ivory-100 border border-navy-200 text-ink-700 font-semibold rounded-xl px-4 py-2.5 text-sm transition",
  ghost:
    "inline-flex items-center justify-center gap-2 text-ink-500 hover:text-ink-900 hover:bg-ivory-100 font-medium rounded-xl px-3 py-2 text-sm transition",
  danger:
    "inline-flex items-center justify-center gap-2 bg-white hover:bg-coral-50 border border-coral-300 text-coral-600 font-semibold rounded-xl px-4 py-2.5 text-sm transition",
  navy: "inline-flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition",
};

export const field =
  "w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-wood-400 focus:ring-2 focus:ring-wood-500/20 focus:outline-none transition";

export const label = "block text-sm font-medium text-ink-700 mb-1.5";

/* --------------------------------- Table --------------------------------- */

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={`px-2.5 sm:px-4 py-3 font-semibold text-xs uppercase tracking-wide text-ink-500 text-left bg-ivory-100 sticky top-0 whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

/* ----------------------------- Avatar / initials -------------------------- */

const AVATAR_TONES = [
  "bg-navy-100 text-navy-800",
  "bg-wood-100 text-wood-800",
  "bg-mint-100 text-mint-700",
  "bg-amber-100 text-amber-700",
  "bg-coral-100 text-coral-700",
];

export function Avatar({
  name,
  className = "w-9 h-9 text-xs",
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const tone = AVATAR_TONES[hash % AVATAR_TONES.length];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 ${tone} ${className}`}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}

/* --------------------------------- Link ---------------------------------- */

/**
 * Tên khách hàng — bấm vào là mở Facebook của họ khi lớp có lưu link. Không
 * có link thì vẫn hiện tên (chữ thường, không bấm được); không có gì thì trả
 * về null để chỗ gọi render thẳng mà không phải tự kiểm tra.
 */
export function CustomerName({
  name,
  facebookUrl,
  className = "",
}: {
  name: string | null;
  facebookUrl: string | null;
  className?: string;
}) {
  if (!name && !facebookUrl) return null;
  if (!facebookUrl) return <span className={className}>{name}</span>;
  return (
    <a
      href={facebookUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Mở Facebook khách hàng"
      className={`inline-flex items-center gap-1 text-navy-600 hover:text-navy-700 hover:underline font-medium ${className}`}
    >
      <IconFacebook className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{name || "Facebook"}</span>
    </a>
  );
}

export function DetailLink({ href, children = "Chi tiết" }: { href: string; children?: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-0.5 text-wood-600 hover:text-wood-700 font-semibold text-sm"
    >
      {children}
      <IconChevronRight className="w-3.5 h-3.5" />
    </Link>
  );
}
