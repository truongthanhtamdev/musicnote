import { getSession } from "@/lib/auth";
import { listClassesForTeacher, getPackageProgress, listAttendance } from "@/lib/queries";
import { formatTimeRange, todayISO } from "@/lib/format";
import { DAY_LABELS } from "@/lib/types";
import AttendanceForm from "./attendance-form";

export default async function TeacherTodayPage() {
  const session = await getSession();
  const teacherId = session!.userId;

  const today = new Date();
  const dow = today.getDay();
  const todayStr = todayISO();
  const todaysAttendance = listAttendance({ teacherId, from: todayStr, to: todayStr });
  const attendanceByClassId = new Map(todaysAttendance.map((a) => [a.class_id, a]));
  const classes = listClassesForTeacher(teacherId)
    .filter((c) => c.day_of_week === dow && c.status === "active")
    .map((c) => ({ ...c, existing: attendanceByClassId.get(c.id) }));
  // Already-checked-in classes drop off "Hôm nay" — the teacher has
  // finished that session; corrections go through "Lịch sử điểm danh".
  const pendingClasses = classes.filter((c) => !c.existing);
  const doneCount = classes.length - pendingClasses.length;

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
      ) : pendingClasses.length === 0 ? (
        <div className="bg-white rounded-xl border border-emerald-200 p-10 text-center text-slate-500">
          <p className="text-3xl mb-2">🎉</p>
          <p>Đã điểm danh xong tất cả lớp hôm nay!</p>
          <p className="text-sm mt-1">
            Cần sửa lại buổi nào, vào{" "}
            <a href="/teacher/attendance" className="text-gold-600 hover:underline">
              Lịch sử điểm danh
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingClasses.map((c) => {
            const progress = getPackageProgress(c);
            const isFirstSessionEver = listAttendance({ classId: c.id }).length === 0;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="mb-3">
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
                      Gói {progress.total} tiết · Đã học {progress.used} · Còn {progress.remaining} ·
                      Hôm nay là buổi thứ {progress.used + 1}
                    </p>
                  )}
                </div>
                <AttendanceForm
                  classId={c.id}
                  sessionDate={todayStr}
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
