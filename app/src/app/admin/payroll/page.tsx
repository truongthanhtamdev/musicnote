import { requireRole } from "@/lib/guard";
import { computePayroll } from "@/lib/queries";
import { formatVND, firstDayOfMonth, lastDayOfMonth } from "@/lib/format";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Chấm công / Tính lương</h1>
        <p className="text-slate-500 text-sm mt-1">
          Lương = số buổi đã dạy (trạng thái &quot;Đã dạy&quot;) × đơn giá/buổi, cộng số buổi học
          thử × 50.000đ/buổi (không theo đơn giá thường).
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
          href={`/admin/payroll/export?from=${from}&to=${to}`}
          className="text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2"
        >
          Xuất CSV
        </a>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">Giáo viên</th>
                <th className="px-4 py-2.5 font-medium">Số buổi đã dạy</th>
                <th className="px-4 py-2.5 font-medium">Buổi thử</th>
                <th className="px-4 py-2.5 font-medium">Đơn giá/buổi</th>
                <th className="px-4 py-2.5 font-medium">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.teacher_id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{r.teacher_name}</td>
                  <td className="px-4 py-2.5">{r.completed_sessions}</td>
                  <td className="px-4 py-2.5">{r.trial_sessions > 0 ? r.trial_sessions : "-"}</td>
                  <td className="px-4 py-2.5">
                    {r.pay_per_session ? formatVND(r.pay_per_session) : "-"}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{formatVND(r.total_pay)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Không có dữ liệu.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td className="px-4 py-2.5" colSpan={4}>
                  Tổng cộng
                </td>
                <td className="px-4 py-2.5">{formatVND(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
