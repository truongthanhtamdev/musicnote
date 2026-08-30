import { requireRole } from "@/lib/guard";
import { listPayments, listExpenses, getRevenueSummary, listClasses } from "@/lib/queries";
import { formatVND, firstDayOfMonth, lastDayOfMonth } from "@/lib/format";
import NewPaymentForm from "./new-payment-form";
import NewExpenseForm from "./new-expense-form";
import DeletePaymentButton from "./delete-payment-button";
import DeleteExpenseButton from "./delete-expense-button";

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
    label: `${c.student_name} (${c.teacher_name || "Chưa xếp GV"})`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Doanh thu</h1>
        <p className="text-slate-500 text-sm mt-1">
          Lợi nhuận = tổng thanh toán thu được − lương giáo viên − chi phí khác (quảng cáo, vận
          hành...) trong khoảng ngày đã chọn.
        </p>
      </div>

      <form className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Từ ngày</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Đến ngày</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-gold-600 hover:bg-gold-700 text-white text-sm font-medium rounded-lg px-4 py-2"
        >
          Xem
        </button>
        <a
          href={`/admin/finance/export?from=${from}&to=${to}`}
          className="text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2"
        >
          Xuất CSV
        </a>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Doanh thu</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatVND(summary.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Lương giáo viên</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatVND(summary.totalPayroll)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Chi phí khác</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatVND(summary.totalExpenses)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Lợi nhuận</p>
          <p
            className={`text-xl font-bold mt-1 ${summary.profit < 0 ? "text-red-600" : "text-emerald-600"}`}
          >
            {formatVND(summary.profit)}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Ghi nhận thanh toán</h2>
            <NewPaymentForm classes={classes} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">
                Danh sách thu ({payments.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {payments.map((p) => (
                <div key={p.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{formatVND(p.amount)}</p>
                    <p className="text-slate-500 text-xs">
                      {p.paid_at} · {p.student_name || "Không gắn lớp"}
                      {p.note ? ` · ${p.note}` : ""}
                    </p>
                  </div>
                  <DeletePaymentButton id={p.id} />
                </div>
              ))}
              {payments.length === 0 && (
                <p className="text-sm text-slate-500 px-4 py-6 text-center">
                  Chưa có khoản thu nào trong khoảng ngày này.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Thêm chi phí</h2>
            <NewExpenseForm />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">
                Danh sách chi phí ({expenses.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {expenses.map((e) => (
                <div key={e.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{formatVND(e.amount)}</p>
                    <p className="text-slate-500 text-xs">
                      {e.expense_date} · {e.category}
                      {e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                  <DeleteExpenseButton id={e.id} />
                </div>
              ))}
              {expenses.length === 0 && (
                <p className="text-sm text-slate-500 px-4 py-6 text-center">
                  Chưa có chi phí nào trong khoảng ngày này.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
