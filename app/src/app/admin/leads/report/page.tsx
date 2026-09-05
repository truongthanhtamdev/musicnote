import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { getLeadBreakdown, getLeadStats, getLostReasons } from "@/lib/queries";
import { firstDayOfMonth, formatVND, lastDayOfMonth } from "@/lib/format";
import { LEAD_STATUS_LABELS, LEARNING_MODE_LABELS, type LeadStatus } from "@/lib/types";
import { PageHeader } from "@/components/app-shell";
import {
  IconArrowUpRight,
  IconBanknote,
  IconChart,
  IconMegaphone,
  IconTarget,
  IconUsers,
} from "@/components/icons";

/** Màu riêng cho từng bước của phễu, để nhìn thanh là biết đang nói bước nào. */
const STAGE_COLORS: Record<LeadStatus, string> = {
  new: "#9aa8ad",
  contacted: "#e3b23c",
  consulting: "#6d8fe0",
  trial_scheduled: "#a78bda",
  trial_done: "#e08a5f",
  won: "#3fa584",
  lost: "#b9c2c0",
  cold: "#d3dad8",
};

const BREAKDOWN_TABS = [
  { key: "source", label: "Nguồn khách", header: "Nguồn khách" },
  { key: "area", label: "Khu vực", header: "Khu vực" },
  { key: "learning_mode", label: "Hình thức học", header: "Hình thức học" },
] as const;

type BreakdownKey = (typeof BREAKDOWN_TABS)[number]["key"];

function percent(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function StatCard({
  label,
  value,
  hint,
  icon,
  dark,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div className={`stat ${dark ? "stat--dark" : ""}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <span className="stat-value">{value}</span>
      <span className="stat-hint">{hint}</span>
    </div>
  );
}

export default async function LeadReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; by?: string }>;
}) {
  await requireRole(["admin", "coordinator"]);
  const sp = await searchParams;
  const from = sp.from || firstDayOfMonth();
  const to = sp.to || lastDayOfMonth();
  const by: BreakdownKey = BREAKDOWN_TABS.some((t) => t.key === sp.by)
    ? (sp.by as BreakdownKey)
    : "source";

  const stats = getLeadStats(from, to);
  const rows = getLeadBreakdown(by, from, to);
  const lostReasons = getLostReasons(from, to);
  const activeTab = BREAKDOWN_TABS.find((t) => t.key === by)!;

  const dmy = (iso: string) => iso.split("-").reverse().join("/");
  // Hai thanh so sánh doanh thu và chi phí quảng cáo vẽ theo cùng một thước.
  const scale = Math.max(stats.revenue, stats.adsSpend, 1);

  return (
    <>
      <PageHeader
        eyebrow="Hiệu quả tuyển sinh"
        title="Báo cáo & doanh thu"
        sub={`${dmy(from)} – ${dmy(to)} · tính theo khách nhận trong kỳ`}
        actions={
          <form className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="by" value={by} />
            <div>
              <label className="label">Từ ngày</label>
              <input type="date" name="from" defaultValue={from} className="input" />
            </div>
            <div>
              <label className="label">Đến ngày</label>
              <input type="date" name="to" defaultValue={to} className="input" />
            </div>
            <button type="submit" className="btn btn-primary">
              Xem
            </button>
            <a href={`/admin/leads/export?from=${from}&to=${to}`} className="btn btn-ghost">
              Xuất CSV
            </a>
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Khách trong kỳ"
          value={String(stats.total).padStart(2, "0")}
          hint="Từ tất cả nguồn"
          icon={<IconUsers />}
        />
        <StatCard
          label="Tỷ lệ chốt"
          value={percent(stats.conversionRate)}
          hint={`${stats.won} khách đăng ký học`}
          icon={<IconTarget />}
        />
        <StatCard
          label="Chi phí quảng cáo"
          value={formatVND(stats.adsSpend)}
          hint="Trong kỳ báo cáo"
          icon={<IconMegaphone />}
        />
        <StatCard
          label="Hiệu quả quảng cáo"
          value={stats.roas != null ? `${stats.roas.toFixed(1).replace(".", ",")}×` : "—"}
          hint="Doanh thu / chi phí"
          icon={<IconArrowUpRight />}
        />
        <StatCard
          label="Doanh thu từ khách"
          value={formatVND(stats.revenue)}
          hint="Học phí đã thu"
          icon={<IconBanknote />}
          dark
        />
      </div>

      <p className="mt-3 text-[12.5px] text-muted">
        Doanh thu tính theo khách nhận trong kỳ, bao gồm cả học phí đóng ở tháng sau.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="panel p-[18px]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="panel-title">Khách đang ở bước nào?</h2>
            <span className="text-[12px] text-muted">{stats.total} khách hàng</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => {
              const count = stats.byStatus[s] || 0;
              const share = stats.total > 0 ? count / stats.total : 0;
              return (
                <div key={s} className="flex items-center gap-3 text-[13px]">
                  <span className="w-24 shrink-0 text-muted">{LEAD_STATUS_LABELS[s]}</span>
                  <span className="bar-track">
                    <span
                      className="bar-fill block"
                      style={{ width: `${Math.max(share * 100, count > 0 ? 4 : 0)}%`, background: STAGE_COLORS[s] }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-right font-semibold text-ink tabular">{count}</span>
                  <span className="w-9 shrink-0 text-right text-[12px] text-muted tabular">
                    {Math.round(share * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel p-[18px]">
          <p className="eyebrow">Hiệu quả quảng cáo</p>
          <p className="mt-2 text-[42px] font-bold leading-none tracking-tight text-brand-700 tabular">
            {stats.roas != null ? stats.roas.toFixed(1).replace(".", ",") : "—"}
            <span className="ml-1 text-[22px] font-semibold text-brand-400">×</span>
          </p>
          <p className="mt-1.5 text-[12.5px] text-muted">Doanh thu trên mỗi đồng quảng cáo</p>

          <div className="mt-5 flex flex-col gap-3">
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-[12.5px]">
                <span className="text-muted">Doanh thu</span>
                <span className="font-semibold text-ink tabular">{formatVND(stats.revenue)}</span>
              </div>
              <span className="bar-track block">
                <span
                  className="bar-fill block bg-brand-500"
                  style={{ width: `${(stats.revenue / scale) * 100}%` }}
                />
              </span>
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-[12.5px]">
                <span className="text-muted">Chi phí quảng cáo</span>
                <span className="font-semibold text-ink tabular">{formatVND(stats.adsSpend)}</span>
              </div>
              <span className="bar-track block">
                <span
                  className="bar-fill block bg-brand-200"
                  style={{ width: `${(stats.adsSpend / scale) * 100}%` }}
                />
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line-soft pt-4">
            <div>
              <p className="text-[11.5px] text-muted">Chi phí / khách (CPL)</p>
              <p className="mt-1 text-[19px] font-bold text-ink tabular">
                {stats.cpl != null ? formatVND(stats.cpl) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11.5px] text-muted">Chi phí / khách chốt (CAC)</p>
              <p className="mt-1 text-[19px] font-bold text-ink tabular">
                {stats.cac != null ? formatVND(stats.cac) : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="panel mt-5">
        <div className="panel-head">
          <h2 className="panel-title">Hiệu quả theo nhóm khách</h2>
          <div className="segmented">
            {BREAKDOWN_TABS.map((t) => (
              <Link
                key={t.key}
                href={`/admin/leads/report?from=${from}&to=${to}&by=${t.key}`}
                aria-current={t.key === by ? "true" : undefined}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>{activeTab.header}</th>
                <th className="num">Số khách</th>
                <th className="num">Đã chốt</th>
                <th className="num">Tỷ lệ chốt</th>
                <th className="num">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="font-medium text-ink">
                    {by === "learning_mode"
                      ? LEARNING_MODE_LABELS[r.key as keyof typeof LEARNING_MODE_LABELS] || r.key
                      : r.key}
                  </td>
                  <td className="num text-ink-soft">{r.total}</td>
                  <td className="num text-ink-soft">{r.won}</td>
                  <td className="num text-ink-soft">{percent(r.conversionRate)}</td>
                  <td className="num font-semibold text-brand-700">
                    {r.revenue > 0 ? formatVND(r.revenue) : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted">
                    Chưa có khách hàng nào trong khoảng ngày này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="panel p-[18px]">
          <div className="flex items-center justify-between">
            <h2 className="panel-title">Cơ hội đang theo dõi</h2>
            <IconChart className="size-[18px] text-brand-400" />
          </div>
          <p className="mt-3 text-[30px] font-bold tracking-tight text-ink tabular">
            {formatVND(stats.pipelineValue)}
          </p>
          <p className="mt-1.5 text-[12.5px] text-muted">
            Doanh thu dự kiến từ {stats.open} khách đang theo.
          </p>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Lý do không chốt</h2>
            <span className="text-[12px] text-muted">{stats.lost} khách</span>
          </div>
          <div>
            {lostReasons.map((r) => (
              <div
                key={r.reason}
                className="flex items-center justify-between gap-3 border-b border-line-soft px-[18px] py-3 text-[13.5px] last:border-b-0"
              >
                <span className="text-ink-soft">{r.reason}</span>
                <span className="badge bg-brand-50 text-brand-700">{r.count} khách</span>
              </div>
            ))}
            {lostReasons.length === 0 && (
              <p className="px-[18px] py-8 text-center text-[13px] text-muted">
                Chưa có khách nào bị đánh dấu từ chối trong kỳ.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
