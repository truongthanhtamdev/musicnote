import { requireRole } from "@/lib/guard";
import { todayISO } from "@/lib/format";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  countByStage,
  getLeadSources,
  listDueLeads,
  listLeads,
  statsBySource,
  type LeadStage,
} from "@/lib/leads";
import { IconBell, IconUsers } from "@/components/icons";
import { Card, CardHeader, EmptyState, MetricCard, PageHeader, TableShell, Th } from "@/components/ui";
import LeadForm from "./lead-form";
import LeadRowItem from "./lead-row";

/**
 * Chăm khách tiềm năng.
 *
 * Khách nhắn tin hỏi han rồi im, hoặc hẹn "vài tuần nữa" — trước giờ họ chỉ
 * nằm trong hộp thư Facebook và gần như chắc chắn bị quên. Trang này giữ họ
 * lại và nhắc đúng ngày.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  await requireRole(["admin", "coordinator"]);
  const sp = await searchParams;
  const stage = (LEAD_STAGES as readonly string[]).includes(sp.stage ?? "")
    ? (sp.stage as LeadStage)
    : "all";

  const today = todayISO();
  const due = listDueLeads();
  const leads = listLeads({ stage });
  const counts = countByStage();
  const sources = getLeadSources();
  const bySource = statsBySource();
  const openCount = counts.new + counts.talking + counts.callback + counts.trial_booked;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Khách tiềm năng"
        subtitle="Khách đã nhắn tin hỏi nhưng chưa đặt lịch học thử. Ghi lại rồi hẹn ngày liên hệ — tới hạn hệ thống sẽ nhắc ở đây."
        action={<LeadForm sources={sources} />}
      />

      {due.length > 0 && (
        <Card className="border-coral-300 bg-coral-50/60">
          <div className="flex items-start gap-3">
            <IconBell className="w-5 h-5 text-coral-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">
                {due.length} khách cần liên hệ hôm nay
              </p>
              <p className="text-sm text-ink-600 mt-0.5">
                {due
                  .slice(0, 6)
                  .map((l) => l.name)
                  .join(" · ")}
                {due.length > 6 ? ` và ${due.length - 6} người nữa` : ""}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Cần liên hệ"
          value={due.length}
          unit="người"
          tone={due.length ? "coral" : "navy"}
        />
        <MetricCard label="Đang theo" value={openCount} unit="người" />
        <MetricCard label="Đã đặt học thử" value={counts.trial_booked} unit="người" />
        <MetricCard label="Đã chốt lớp" value={counts.won} unit="người" tone="mint" />
      </div>

      {bySource.length > 0 && (
        <Card padded={false}>
          <CardHeader title="Nguồn nào ra khách tốt nhất" />
          <div className="px-5 pt-3 pb-1">
            <p className="text-sm text-ink-500">
              Tỉ lệ chốt tính trên tổng khách của nguồn đó. Số còn ít thì đọc cho vui thôi — vài
              chục khách mỗi nguồn trở lên mới đủ để tin.
            </p>
          </div>
          <TableShell>
            <thead>
              <tr>
                <Th>Nguồn</Th>
                <Th className="text-right">Tổng khách</Th>
                <Th className="text-right">Đặt học thử</Th>
                <Th className="text-right">Chốt lớp</Th>
                <Th className="text-right">Tỉ lệ chốt</Th>
              </tr>
            </thead>
            <tbody>
              {bySource.map((r) => (
                <tr key={r.source} className="border-t border-navy-100">
                  <td className="px-4 py-2.5 text-sm font-medium text-ink-900">{r.source}</td>
                  <td className="px-4 py-2.5 text-sm text-ink-700 tabular text-right">{r.total}</td>
                  <td className="px-4 py-2.5 text-sm text-ink-700 tabular text-right">{r.trial}</td>
                  <td className="px-4 py-2.5 text-sm font-semibold text-mint-700 tabular text-right">
                    {r.won}
                  </td>
                  <td className="px-4 py-2.5 text-sm tabular text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        r.winRate >= 30
                          ? "bg-mint-50 text-mint-700"
                          : r.winRate >= 10
                            ? "bg-wood-50 text-wood-700"
                            : "bg-ivory-100 text-ink-500"
                      }`}
                    >
                      {r.winRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", ...LEAD_STAGES] as const).map((s) => (
          <a
            key={s}
            href={s === "all" ? "/admin/tiem-nang" : `/admin/tiem-nang?stage=${s}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
              stage === s
                ? "border-wood-600 bg-wood-600 text-white"
                : "border-navy-200 bg-white text-ink-600 hover:border-wood-300"
            }`}
          >
            {s === "all" ? "Tất cả" : LEAD_STAGE_LABELS[s]}
            {s !== "all" && counts[s] > 0 && (
              <span className="ml-1.5 opacity-70">{counts[s]}</span>
            )}
          </a>
        ))}
      </div>

      {leads.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<IconUsers className="w-7 h-7" />}
            title="Chưa có khách nào trong danh sách"
            description="Khách nhắn tin hỏi trên Facebook hay Zalo thì bấm Thêm khách để lưu lại. Chỉ cần tên là lưu được, phần còn lại điền dần khi biết thêm."
          />
        </Card>
      ) : (
        <Card padded={false}>
          <TableShell>
            <thead>
              <tr>
                <Th>Khách</Th>
                <Th>Muốn học</Th>
                <Th>Khách thế nào</Th>
                <Th>Hẹn liên hệ</Th>
                <Th>Giai đoạn</Th>
                <Th className="text-right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <LeadRowItem key={l.id} lead={l} todayISO={today} sources={sources} />
              ))}
            </tbody>
          </TableShell>
        </Card>
      )}
    </div>
  );
}
