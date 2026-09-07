import { requireRole } from "@/lib/guard";
import {
  listPayments,
  listExpenses,
  getRevenueSummary,
  listClasses,
  getPackage,
} from "@/lib/queries";
import { formatVND, firstDayOfMonth, lastDayOfMonth } from "@/lib/format";
import { formatPayerLabel } from "@/lib/types";
import { IconChart, IconDownload, IconFilter, IconWallet } from "@/components/icons";
import { Card, CardHeader, MetricCard, PageHeader, btn, field, label } from "@/components/ui";
import NewPaymentForm from "./new-payment-form";
import NewExpenseForm from "./new-expense-form";
import PaymentRow from "./payment-row";
import ExpenseRow from "./expense-row";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const from = sp.from || firstDayOfMonth();
  const to = sp.to || lastDayOfMonth();

  const payments = listPayments(from, to);
  const expenses = listExpenses(from, to);
  const summary = getRevenueSummary(from, to);
  const classes = listClasses().map((c) => ({
    id: c.id,
    label: `${formatPayerLabel(c)} (${c.teacher_name || "Chưa xếp GV"})`,
    subject: c.subject,
    packageTotal: c.package_id ? (getPackage(c.package_id)?.total_sessions ?? null) : null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Doanh thu"
        subtitle="Lợi nhuận = tổng thanh toán thu được − lương giáo viên − chi phí khác (quảng cáo, vận hành...) trong khoảng ngày đã chọn."
      />

      <Card>
        <form className="flex flex-wrap gap-3 items-end">
          <div>
            <label className={label} htmlFor="f-from">
              Từ ngày
            </label>
            <input
              id="f-from"
              type="date"
              name="from"
              defaultValue={from}
              className={`${field} w-auto`}
            />
          </div>
          <div>
            <label className={label} htmlFor="f-to">
              Đến ngày
            </label>
            <input
              id="f-to"
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
          <a href={`/admin/finance/export?from=${from}&to=${to}`} className={btn.secondary}>
            <IconDownload className="w-4 h-4" />
            Xuất CSV
          </a>
        </form>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Doanh thu"
          value={formatVND(summary.totalRevenue)}
          tone="mint"
          icon={<IconChart className="w-5 h-5" />}
        />
        <MetricCard
          label="Lương giáo viên"
          value={formatVND(summary.totalPayroll)}
          tone="navy"
          icon={<IconWallet className="w-5 h-5" />}
        />
        <MetricCard label="Chi phí khác" value={formatVND(summary.totalExpenses)} tone="amber" />
        <MetricCard
          label="Lợi nhuận"
          value={formatVND(summary.profit)}
          tone={summary.profit < 0 ? "coral" : "mint"}
          hint={summary.profit < 0 ? "Đang lỗ trong khoảng này" : "Đang có lãi"}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <Card padded={false}>
            <CardHeader title="Ghi nhận thanh toán" />
            <div className="p-5">
              <NewPaymentForm classes={classes} />
            </div>
          </Card>
          <Card padded={false}>
            <CardHeader title="Danh sách thu" count={payments.length} />
            <div className="divide-y divide-navy-100 max-h-96 overflow-y-auto scroll-thin">
              {payments.map((p) => (
                <PaymentRow
                  key={p.id}
                  payment={{
                    id: p.id,
                    amount: p.amount,
                    paid_at: p.paid_at,
                    note: p.note,
                    class_id: p.class_id,
                    label: p.student_name
                      ? formatPayerLabel({
                          student_name: p.student_name,
                          guardian_name: p.guardian_name,
                        })
                      : "Không gắn lớp",
                  }}
                  classes={classes}
                />
              ))}
              {payments.length === 0 && (
                <p className="text-sm text-ink-500 px-5 py-8 text-center">
                  Chưa có khoản thu nào trong khoảng ngày này.
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card padded={false}>
            <CardHeader title="Thêm chi phí" />
            <div className="p-5">
              <NewExpenseForm />
            </div>
          </Card>
          <Card padded={false}>
            <CardHeader title="Danh sách chi phí" count={expenses.length} />
            <div className="divide-y divide-navy-100 max-h-96 overflow-y-auto scroll-thin">
              {expenses.map((e) => (
                <ExpenseRow key={e.id} expense={e} />
              ))}
              {expenses.length === 0 && (
                <p className="text-sm text-ink-500 px-5 py-8 text-center">
                  Chưa có chi phí nào trong khoảng ngày này.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
