import { getSession } from "@/lib/auth";
import { computePayroll } from "@/lib/queries";
import { formatVND } from "@/lib/format";

function firstDayOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function lastDayOfMonth(): string {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

export default async function TeacherEarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getSession();
  const sp = await searchParams;
  const from = sp.from || firstDayOfMonth();
  const to = sp.to || lastDayOfMonth();

  const all = computePayroll(from, to);
  const mine = all.find((r) => r.teacher_id === session!.userId);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Thu nhập của tôi</h1>

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
      </form>

      <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-slate-500">Số buổi đã dạy</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{mine?.completed_sessions ?? 0}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Đơn giá/buổi</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {mine?.pay_per_session ? formatVND(mine.pay_per_session) : "-"}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Tổng thu nhập</p>
          <p className="text-2xl font-bold text-gold-600 mt-1">
            {formatVND(mine?.total_pay ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
