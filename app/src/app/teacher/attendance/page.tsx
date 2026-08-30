import { getSession } from "@/lib/auth";
import { listAttendance, listClassesForTeacher } from "@/lib/queries";
import { addDays, toISODate, todayISO } from "@/lib/format";
import { ATTENDANCE_STATUS_LABELS, DAY_LABELS } from "@/lib/types";
import MakeupAttendanceForm from "./makeup-attendance-form";

export default async function TeacherAttendanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getSession();
  const sp = await searchParams;
  const from = sp.from || toISODate(addDays(new Date(), -30));
  const to = sp.to || todayISO();

  const rows = listAttendance({ teacherId: session!.userId, from, to });
  const myClasses = listClassesForTeacher(session!.userId)
    .filter((c) => c.status === "active")
    .map((c) => ({
      id: c.id,
      label: `${c.student_name} · ${DAY_LABELS[c.day_of_week]} ${c.start_time}`,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-900">Lịch sử điểm danh</h1>
        <MakeupAttendanceForm classes={myClasses} />
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
          Lọc
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Ngày</th>
              <th className="px-4 py-2.5 font-medium">Học sinh</th>
              <th className="px-4 py-2.5 font-medium">Trạng thái</th>
              <th className="px-4 py-2.5 font-medium">Giờ</th>
              <th className="px-4 py-2.5 font-medium">Nội dung bài học</th>
              <th className="px-4 py-2.5 font-medium">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2.5">{a.session_date}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{a.student_name}</td>
                <td className="px-4 py-2.5">
                  {ATTENDANCE_STATUS_LABELS[a.status]}
                  {!!a.is_trial && (
                    <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">
                      Thử
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-500">{a.check_in_time || "-"}</td>
                <td className="px-4 py-2.5 text-slate-600">{a.lesson_content || "-"}</td>
                <td className="px-4 py-2.5 text-slate-500">{a.note || "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Không có dữ liệu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
