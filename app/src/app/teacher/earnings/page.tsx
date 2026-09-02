import { getSession } from "@/lib/auth";
import { computePayroll, listAttendance } from "@/lib/queries";
import { firstDayOfMonth, formatVND, lastDayOfMonth } from "@/lib/format";
import { TRIAL_SESSION_RATE } from "@/lib/types";
import { IconCheckCircle, IconFilter, IconWallet } from "@/components/icons";
import { Card, MetricCard, PageHeader, btn, field, label } from "@/components/ui";

export default async function TeacherEarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getSession();
  const sp = await searchParams;
  const from = sp.from || firstDayOfMonth();
  const to = sp.to || lastDayOfMonth();

  const mine = computePayroll(from, to).find((r) => r.teacher_id === session!.userId);
  const rows = listAttendance({ teacherId: session!.userId, from, to }).filter(
    (a) => a.status === "completed"
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Thu nhập của tôi"
        subtitle="Lương được tính tự động từ số tiết đã điểm danh trong khoảng thời gian bạn chọn."
      />

      <Card>
        <form className="flex flex-wrap gap-3 items-end">
          <div>
            <label className={label} htmlFor="e-from">
              Từ ngày
            </label>
            <input
              id="e-from"
              type="date"
              name="from"
              defaultValue={from}
              className={`${field} w-auto`}
            />
          </div>
          <div>
            <label className={label} htmlFor="e-to">
              Đến ngày
            </label>
            <input id="e-to" type="date" name="to" defaultValue={to} className={`${field} w-auto`} />
          </div>
          <button type="submit" className={btn.primary}>
            <IconFilter className="w-4 h-4" />
            Xem
          </button>
        </form>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Số tiết đã dạy"
          value={mine?.completed_sessions ?? 0}
          unit="tiết"
          tone="mint"
          icon={<IconCheckCircle className="w-5 h-5" />}
        />
        <MetricCard
          label="Buổi học thử"
          value={mine?.trial_sessions ?? 0}
          unit="buổi"
          hint={`${formatVND(TRIAL_SESSION_RATE)}/buổi`}
          tone="wood"
        />
        <MetricCard
          label="Đơn giá mỗi tiết"
          value={mine?.pay_per_session ? formatVND(mine.pay_per_session) : "—"}
          tone="navy"
        />
        <MetricCard
          label="Tổng thu nhập"
          value={formatVND(mine?.total_pay ?? 0)}
          tone="amber"
          icon={<IconWallet className="w-5 h-5" />}
        />
      </div>

      <Card padded={false}>
        <div className="px-5 py-3.5 border-b border-navy-100">
          <h2 className="font-semibold text-ink-900">Chi tiết các buổi đã dạy</h2>
          <p className="text-sm text-ink-500 mt-0.5 tabular">
            {rows.length} buổi từ {from} đến {to}
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-500">
            Chưa có buổi dạy nào trong khoảng thời gian này.
          </p>
        ) : (
          <ul className="divide-y divide-navy-100 max-h-96 overflow-y-auto scroll-thin">
            {rows.map((a) => (
              <li key={a.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                <span className="text-sm text-ink-700 min-w-0 truncate">
                  <span className="tabular text-ink-500">{a.session_date}</span> ·{" "}
                  <span className="font-medium text-ink-900">{a.student_name}</span>
                  {a.is_trial ? <span className="text-wood-700"> · buổi học thử</span> : null}
                </span>
                <span className="text-sm font-semibold text-ink-900 tabular shrink-0">
                  {formatVND(a.is_trial ? TRIAL_SESSION_RATE : mine?.pay_per_session || 0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
