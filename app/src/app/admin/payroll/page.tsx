import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { computePayroll } from "@/lib/queries";
import { formatVND, firstDayOfMonth, lastDayOfMonth } from "@/lib/format";
import { TRIAL_SESSION_RATE } from "@/lib/types";
import { IconCheckCircle, IconDownload, IconFilter, IconWallet } from "@/components/icons";
import {
  Avatar,
  Card,
  EmptyState,
  MetricCard,
  PageHeader,
  TableShell,
  Th,
  btn,
  field,
  label,
} from "@/components/ui";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const from = sp.from || firstDayOfMonth();
  const to = sp.to || lastDayOfMonth();

  const rows = computePayroll(from, to);
  const total = rows.reduce((sum, r) => sum + r.total_pay, 0);
  const sessions = rows.reduce((sum, r) => sum + r.completed_sessions, 0);
  const trials = rows.reduce((sum, r) => sum + r.trial_sessions, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chấm công / Tính lương"
        subtitle={`Lương = số buổi "Đã dạy" × đơn giá/buổi, cộng số buổi học thử × ${formatVND(TRIAL_SESSION_RATE)}/buổi (không theo đơn giá thường).`}
      />

      <Card>
        <form className="flex flex-wrap gap-3 items-end">
          <div>
            <label className={label} htmlFor="p-from">
              Từ ngày
            </label>
            <input
              id="p-from"
              type="date"
              name="from"
              defaultValue={from}
              className={`${field} w-auto`}
            />
          </div>
          <div>
            <label className={label} htmlFor="p-to">
              Đến ngày
            </label>
            <input
              id="p-to"
              type="date"
              name="to"
              defaultValue={to}
              className={`${field} w-auto`}
            />
          </div>
          <button type="submit" className={btn.primary}>
            <IconFilter className="w-4 h-4" />
            Xem
          </button>
          <a href={`/admin/payroll/export?from=${from}&to=${to}`} className={btn.secondary}>
            <IconDownload className="w-4 h-4" />
            Xuất CSV
          </a>
        </form>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Tổng số tiết"
          value={sessions}
          unit="tiết"
          tone="mint"
          icon={<IconCheckCircle className="w-5 h-5" />}
        />
        <MetricCard label="Buổi học thử" value={trials} unit="buổi" tone="wood" />
        <MetricCard label="Số giáo viên có lương" value={rows.filter((r) => r.total_pay > 0).length} unit="người" />
        <MetricCard
          label="Tổng chi lương"
          value={formatVND(total)}
          tone="amber"
          icon={<IconWallet className="w-5 h-5" />}
        />
      </div>

      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState
            icon={<IconWallet className="w-6 h-6" />}
            title="Không có dữ liệu trong khoảng này"
            description="Chọn khoảng thời gian khác để xem bảng lương."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Giáo viên</Th>
                <Th className="text-right">Số buổi đã dạy</Th>
                <Th className="text-right">Buổi thử</Th>
                <Th className="text-right">Đơn giá/buổi</Th>
                <Th className="text-right">Thành tiền</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {rows.map((r) => (
                <tr key={r.teacher_id} className="hover:bg-ivory-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/attendance?teacherId=${r.teacher_id}&from=${from}&to=${to}`}
                      title="Xem lịch sử điểm danh của giáo viên này trong cùng khoảng ngày"
                      className="flex items-center gap-2.5 font-medium text-ink-900 hover:text-wood-700 whitespace-nowrap"
                    >
                      <Avatar name={r.teacher_name} className="w-8 h-8 text-[11px]" />
                      {r.teacher_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular text-ink-700">
                    {r.completed_sessions}
                  </td>
                  <td className="px-4 py-3 text-right tabular text-ink-700">
                    {r.trial_sessions > 0 ? r.trial_sessions : "–"}
                  </td>
                  <td className="px-4 py-3 text-right tabular text-ink-700 whitespace-nowrap">
                    {r.pay_per_session ? formatVND(r.pay_per_session) : "–"}
                  </td>
                  <td className="px-4 py-3 text-right tabular font-semibold text-ink-900 whitespace-nowrap">
                    {formatVND(r.total_pay)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-ivory-100 font-semibold text-ink-900">
                <td className="px-4 py-3" colSpan={4}>
                  Tổng cộng
                </td>
                <td className="px-4 py-3 text-right tabular whitespace-nowrap">
                  {formatVND(total)}
                </td>
              </tr>
            </tfoot>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
