import { listAttendance, listTeachers } from "@/lib/queries";
import { todayISO, addDays, toISODate } from "@/lib/format";
import AttendanceRow from "./attendance-row";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const teachers = listTeachers(true);

  const defaultFrom = toISODate(addDays(new Date(), -7));
  const from = sp.from || defaultFrom;
  const to = sp.to || todayISO();
  const teacherId = sp.teacherId ? Number(sp.teacherId) : undefined;

  const rows = listAttendance({ teacherId, from, to });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Nhật ký điểm danh</h1>
        <p className="text-slate-500 text-sm mt-1">
          Ghi nhận từ hệ thống. Giáo viên vẫn cần điểm danh song song trên nhóm Facebook như quy định.
        </p>
      </div>

      <form className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Giáo viên</label>
          <select
            name="teacherId"
            defaultValue={teacherId || ""}
            className="input"
          >
            <option value="">Tất cả</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Từ ngày</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="input"
          />
        </div>
        <div>
          <label className="label">Đến ngày</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="input"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
        >
          Lọc
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">Ngày</th>
                <th className="px-4 py-2.5 font-medium">Học sinh</th>
                <th className="px-4 py-2.5 font-medium">Giáo viên</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 font-medium">FB</th>
                <th className="px-4 py-2.5 font-medium">Giờ điểm danh</th>
                <th className="px-4 py-2.5 font-medium">Nội dung bài học</th>
                <th className="px-4 py-2.5 font-medium">Ghi chú</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((a) => (
                <AttendanceRow key={a.id} row={a} />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                    Không có dữ liệu trong khoảng thời gian này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
