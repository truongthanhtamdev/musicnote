import { getSession } from "@/lib/auth";
import { listClassesForTeacher, getAttendance, getPackageProgress, listAttendance } from "@/lib/queries";
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
  const doneCount = classes.filter((c) => getAttendance(c.id, todayStr)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Chào {session!.name.split(" ").pop()} 👋</h1>
        <p className="text-slate-500 text-sm mt-1">
          {DAY_LABELS[dow]}, {todayStr}
          {classes.length > 0 && ` · Đã điểm danh ${doneCount}/${classes.length} lớp`}
        </p>
        <p className="text-amber-700 bg-amber-50 border border-amber-100 rounded-lg text-sm mt-2 px-3 py-2">
          Nhớ điểm danh trên nhóm Facebook song song như quy định nhé.
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          <p className="text-3xl mb-2">🎸</p>
          <p>Hôm nay bạn không có lớp nào. Nghỉ ngơi thôi!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((c) => {
            const existing = getAttendance(c.id, todayStr);
            const progress = getPackageProgress(c);
            const isFirstSessionEver = listAttendance({ classId: c.id }).length === 0;
            return (
              <div
                key={c.id}
                className={`bg-white rounded-xl border p-4 ${
                  existing ? "border-emerald-200" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {c.student_name}
                      {c.language === "en" && (
                        <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 align-middle">
                          EN
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatTimeRange(c.start_time, c.duration_minutes)} · {c.subject}
                      {c.level ? ` · ${c.level}` : ""}
                      {c.guardian_name ? ` · PH: ${c.guardian_name}` : ""}
                    </p>
                    {progress && (
                      <p
                        className={`text-xs mt-0.5 ${
                          progress.remaining <= 3 ? "text-amber-600 font-medium" : "text-slate-400"
                        }`}
                      >
                        Gói {progress.total} tiết · Đã học {progress.used} · Còn {progress.remaining}
                        {!existing && ` · Hôm nay là buổi thứ ${progress.used + 1}`}
                      </p>
                    )}
                  </div>
                  {existing && (
                    <span className="shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      ✓ Đã điểm danh {existing.check_in_time}
                      {existing.status === "rescheduled" && existing.rescheduled_to_date && (
                        <span className="block font-normal text-slate-500">
                          → {existing.rescheduled_to_date}
                          {existing.rescheduled_to_time ? ` ${existing.rescheduled_to_time}` : ""}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <AttendanceForm
                  classId={c.id}
                  sessionDate={todayStr}
                  existing={existing}
                  defaultTrial={isFirstSessionEver}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
