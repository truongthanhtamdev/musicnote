import { getSession } from "@/lib/auth";
import { listClassesForTeacher, getAttendance } from "@/lib/queries";
import { formatTimeRange, todayISO } from "@/lib/format";
import { DAY_LABELS } from "@/lib/types";
import AttendanceForm from "./attendance-form";

export default async function TeacherTodayPage() {
  const session = await getSession();
  const teacherId = session!.userId;

  const today = new Date();
  const dow = today.getDay();
  const todayStr = todayISO();
  const classes = listClassesForTeacher(teacherId).filter(
    (c) => c.day_of_week === dow && c.status === "active"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Lớp học hôm nay</h1>
        <p className="text-slate-500 text-sm mt-1">
          {DAY_LABELS[dow]}, {todayStr} · Đừng quên điểm danh trên nhóm Facebook như thường lệ.
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          Hôm nay bạn không có lớp nào.
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((c) => {
            const existing = getAttendance(c.id, todayStr);
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-900">{c.student_name}</p>
                    <p className="text-sm text-slate-500">
                      {formatTimeRange(c.start_time, c.duration_minutes)}
                      {c.level ? ` · ${c.level}` : ""}
                    </p>
                  </div>
                  {existing && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      Đã điểm danh lúc {existing.check_in_time}
                    </span>
                  )}
                </div>
                <AttendanceForm classId={c.id} sessionDate={todayStr} existing={existing} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
