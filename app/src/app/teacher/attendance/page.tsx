import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listAttendance, listClassesForTeacher, getClass } from "@/lib/queries";
import { addDays, toISODate, todayISO } from "@/lib/format";
import { formatClassSchedule, CLASS_STATUS_LABELS } from "@/lib/types";
import MakeupAttendanceForm from "./makeup-attendance-form";
import TeacherAttendanceHistoryRow from "./history-row";

export default async function TeacherAttendanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; classId?: string }>;
}) {
  const session = await getSession();
  const sp = await searchParams;
  const classId = sp.classId ? Number(sp.classId) : undefined;
  // Filtering to one student's own history should show all of it, not
  // just the default 30-day window everyone else's combined log uses —
  // omitting `from` entirely (rather than a fake early sentinel date)
  // already means "no lower bound" to listAttendance.
  const from = sp.from || (classId ? undefined : toISODate(addDays(new Date(), -30)));
  const to = sp.to || todayISO();

  const rows = listAttendance({ teacherId: session!.userId, from, to, classId });
  // Not filtered to active classes — a teacher may still need to add or
  // correct attendance for a class that has since paused or ended.
  const myClasses = listClassesForTeacher(session!.userId).map((c) => ({
    id: c.id,
    label: `${c.student_name} · ${formatClassSchedule(c)}${
      c.status === "active" ? "" : ` (${CLASS_STATUS_LABELS[c.status]})`
    }`,
  }));
  // The filtered rows already carry the student's name; only fall back to
  // a lookup when there's no attendance yet to read it from.
  const filteredStudentName = classId ? (rows[0]?.student_name ?? getClass(classId)?.student_name) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-900">
          Lịch sử điểm danh
          {filteredStudentName && (
            <>
              {" · "}
              <span className="text-gold-700">{filteredStudentName}</span>
            </>
          )}
        </h1>
        <div className="flex items-center gap-3">
          {classId && (
            <Link href="/teacher/attendance" className="text-sm text-slate-500 hover:underline">
              Xem tất cả học viên
            </Link>
          )}
          <MakeupAttendanceForm classes={myClasses} />
        </div>
      </div>

      <form className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        {classId && <input type="hidden" name="classId" value={classId} />}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Từ ngày</label>
          <input
            type="date"
            name="from"
            defaultValue={from || ""}
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
              <TeacherAttendanceHistoryRow key={a.id} row={a} />
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
