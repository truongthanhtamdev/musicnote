import { requireRole } from "@/lib/guard";
import { db } from "@/lib/db";
import { ADMIN_AREA_ROLES } from "@/lib/types";
import { firstDayOfMonth, formatVND, lastDayOfMonth, monthRangeOf, todayISO } from "@/lib/format";
import { getBonusRates, listBonusesForStaff, type BonusRow } from "@/lib/bonus";
import { MonthSelect } from "@/components/month-select";
import { MonthNav } from "@/components/month-nav";
import { IconWallet } from "@/components/icons";
import { Card, CardHeader, EmptyState, MetricCard, PageHeader, TableShell, Th } from "@/components/ui";

const KIND_LABEL: Record<BonusRow["kind"], string> = {
  trial: "Học thử",
  conversion: "Chốt lớp",
  manual: "Ghi tay",
};

/**
 * Thu nhập của chính nhân viên đặt hẹn: thưởng học thử, chốt lớp, khoản ghi
 * tay trong tháng. Mỗi người chỉ thấy phần của mình — bảng thưởng của cả
 * trung tâm vẫn ở trang "Thưởng giáo vụ" dành cho Quản lý.
 */
export default async function MyEarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await requireRole(ADMIN_AREA_ROLES);
  const sp = await searchParams;
  const from = sp.from || firstDayOfMonth();
  const to = sp.to || lastDayOfMonth();

  const rates = getBonusRates();
  const mine = listBonusesForStaff(session.userId, from, to);

  // Các tháng để chọn nhanh: từ khoản thưởng đầu tiên tới tháng này.
  const thisMonth = monthRangeOf(todayISO()).from.slice(0, 7);
  const first = (
    db.prepare("SELECT MIN(earned_at) AS d FROM staff_bonuses WHERE staff_id = ?").get(session.userId) as {
      d: string | null;
    }
  ).d;
  const months: string[] = [];
  for (let m = thisMonth; months.length < 36; ) {
    months.push(m);
    if (!first || m <= first.slice(0, 7)) break;
    m = monthRangeOf(`${m}-01`, -1).from.slice(0, 7);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Thu nhập của tôi"
        subtitle={`Mỗi buổi học thử khách đến học ${formatVND(rates.trial)}, khách đóng tiền lần đầu cộng thêm ${formatVND(rates.conversion)}. Hệ thống tự ghi khi giáo viên điểm danh buổi học thử / khách đóng học phí.`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <MonthSelect months={months} from={from} to={to} />
        <MonthNav from={from} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Tổng thu nhập kỳ này"
          value={formatVND(mine?.total ?? 0)}
          icon={<IconWallet className="w-5 h-5" />}
          tone="mint"
        />
        <MetricCard
          label="Buổi học thử"
          value={mine?.trial_count ?? 0}
          unit="buổi"
          hint={formatVND(mine?.trial_total ?? 0)}
        />
        <MetricCard
          label="Khách chốt lớp"
          value={mine?.conversion_count ?? 0}
          unit="khách"
          hint={formatVND(mine?.conversion_total ?? 0)}
        />
        <MetricCard label="Ghi tay (cộng/trừ)" value={formatVND(mine?.manual_total ?? 0)} />
      </div>

      <Card padded={false}>
        <CardHeader title="Chi tiết từng khoản" count={mine?.rows.length ?? 0} />
        {!mine || mine.rows.length === 0 ? (
          <EmptyState
            icon={<IconWallet className="w-6 h-6" />}
            title="Chưa có khoản thưởng nào trong kỳ này"
            description="Khách bạn hẹn học thử đến học là có thưởng ngay sau khi giáo viên điểm danh."
          />
        ) : (
          <TableShell stackOnMobile>
            <thead>
              <tr>
                <Th>Ngày</Th>
                <Th>Loại</Th>
                <Th>Nội dung</Th>
                <Th className="text-right">Số tiền</Th>
              </tr>
            </thead>
            <tbody>
              {mine.rows.map((r) => (
                <tr key={r.id} className="border-t border-navy-100">
                  <td className="px-4 py-2.5 text-sm text-ink-700 tabular whitespace-nowrap">
                    {r.earned_at.split("-").reverse().join("/")}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        r.kind === "conversion"
                          ? "bg-mint-50 text-mint-700"
                          : r.kind === "trial"
                            ? "bg-wood-50 text-wood-700"
                            : "bg-ivory-100 text-ink-600"
                      }`}
                    >
                      {KIND_LABEL[r.kind]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-ink-600">{r.note ?? "—"}</td>
                  <td
                    className={`px-4 py-2.5 text-sm font-semibold tabular text-right whitespace-nowrap ${
                      r.amount < 0 ? "text-coral-600" : "text-ink-900"
                    }`}
                  >
                    {formatVND(r.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
