import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { getLeadBreakdown, getLeadStats, getLostReasons, type LeadBreakdownRow } from "@/lib/queries";
import { firstDayOfMonth, formatVND, lastDayOfMonth } from "@/lib/format";
import { LEAD_STATUS_LABELS, LEARNING_MODE_LABELS, type LeadStatus } from "@/lib/types";

const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm";

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={`text-xl font-bold mt-1 ${
          tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function percent(v: number | null): string {
  return v == null ? "-" : `${Math.round(v * 100)}%`;
}

function BreakdownTable({
  title,
  rows,
  labelHeader,
  renderKey,
}: {
  title: string;
  rows: LeadBreakdownRow[];
  labelHeader: string;
  renderKey?: (key: string) => string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">{labelHeader}</th>
              <th className="px-4 py-2.5 font-medium text-right">Lead</th>
              <th className="px-4 py-2.5 font-medium text-right">Chốt</th>
              <th className="px-4 py-2.5 font-medium text-right">Tỉ lệ</th>
              <th className="px-4 py-2.5 font-medium text-right">Doanh thu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.key} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-900">{renderKey ? renderKey(r.key) : r.key}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{r.total}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{r.won}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{percent(r.conversionRate)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                  {r.revenue > 0 ? formatVND(r.revenue) : "-"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Chưa có dữ liệu trong khoảng ngày này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function LeadReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["admin", "coordinator"]);
  const sp = await searchParams;
  const from = sp.from || firstDayOfMonth();
  const to = sp.to || lastDayOfMonth();

  const stats = getLeadStats(from, to);
  const bySource = getLeadBreakdown("source", from, to);
  const byArea = getLeadBreakdown("area", from, to);
  const byMode = getLeadBreakdown("learning_mode", from, to);
  const lostReasons = getLostReasons(from, to);
  const maxStatus = Math.max(1, ...Object.values(stats.byStatus));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Báo cáo khách hàng tiềm năng</h1>
          <p className="text-slate-500 text-sm mt-1">
            Tính theo lứa lead <b>nhận trong khoảng ngày</b>: doanh thu là toàn bộ học phí những
            khách đó đã đóng (kể cả đóng ở tháng sau), so với chi phí quảng cáo đã bỏ ra trong kỳ.
          </p>
        </div>
        <Link
          href="/admin/leads"
          className="text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2"
        >
          ← Danh sách
        </Link>
      </div>

      <form className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Từ ngày</label>
          <input type="date" name="from" defaultValue={from} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Đến ngày</label>
          <input type="date" name="to" defaultValue={to} className={inputClass} />
        </div>
        <button
          type="submit"
          className="bg-gold-600 hover:bg-gold-700 text-white text-sm font-medium rounded-lg px-4 py-2"
        >
          Xem
        </button>
        <a
          href={`/admin/leads/export?from=${from}&to=${to}`}
          className="text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2"
        >
          Xuất CSV
        </a>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Lead nhận trong kỳ" value={String(stats.total)} />
        <StatCard
          label="Đã chốt"
          value={String(stats.won)}
          hint={`Tỉ lệ chốt ${percent(stats.conversionRate)}`}
        />
        <StatCard label="Đang theo" value={String(stats.open)} hint={`Từ chối/nguội: ${stats.lost}`} />
        <StatCard
          label="Doanh thu từ lead"
          value={formatVND(stats.revenue)}
          tone="good"
          hint={`Dự kiến còn ${formatVND(stats.pipelineValue)} từ khách đang theo`}
        />
        <StatCard label="Chi phí quảng cáo" value={formatVND(stats.adsSpend)} tone="bad" />
        <StatCard
          label="Chi phí / lead (CPL)"
          value={stats.cpl != null ? formatVND(stats.cpl) : "-"}
          hint="tiền quảng cáo cho mỗi khách nhắn tin"
        />
        <StatCard
          label="Chi phí / khách chốt (CAC)"
          value={stats.cac != null ? formatVND(stats.cac) : "-"}
          hint="tiền quảng cáo cho mỗi học viên đăng ký"
        />
        <StatCard
          label="Hiệu quả quảng cáo"
          value={stats.roas != null ? `${stats.roas.toFixed(1)}x` : "-"}
          tone={stats.roas != null && stats.roas >= 1 ? "good" : "bad"}
          hint="doanh thu / chi phí quảng cáo"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-900 mb-3">Lead đang nằm ở bước nào</h2>
        <div className="space-y-2">
          {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => {
            const count = stats.byStatus[s] || 0;
            return (
              <div key={s} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 text-slate-600">{LEAD_STATUS_LABELS[s]}</span>
                <div className="grow bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full ${
                      s === "won" ? "bg-emerald-500" : s === "lost" || s === "cold" ? "bg-red-300" : "bg-gold-400"
                    }`}
                    style={{ width: `${(count / maxStatus) * 100}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-slate-900 font-medium">
                  {count}
                  {stats.total > 0 && (
                    <span className="text-slate-400 font-normal">
                      {" "}
                      ({Math.round((count / stats.total) * 100)}%)
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <BreakdownTable title="Theo nguồn" rows={bySource} labelHeader="Nguồn" />
        <BreakdownTable title="Theo khu vực" rows={byArea} labelHeader="Khu vực" />
        <BreakdownTable
          title="Theo hình thức học"
          rows={byMode}
          labelHeader="Hình thức"
          renderKey={(k) => LEARNING_MODE_LABELS[k as keyof typeof LEARNING_MODE_LABELS] || k}
        />
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Lý do không chốt</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {lostReasons.map((r) => (
              <div key={r.reason} className="px-4 py-2.5 flex justify-between text-sm">
                <span className="text-slate-700">{r.reason}</span>
                <span className="font-medium text-slate-900">{r.count}</span>
              </div>
            ))}
            {lostReasons.length === 0 && (
              <p className="text-sm text-slate-500 px-4 py-6 text-center">
                Chưa có khách nào bị đánh dấu từ chối trong kỳ.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
