import { getSession } from "@/lib/auth";
import { listClassesForStudent, getPackageProgress, listAttendance } from "@/lib/queries";
import { formatTimeRange } from "@/lib/format";
import { DAY_LABELS, ATTENDANCE_STATUS_LABELS } from "@/lib/types";

export default async function StudentHomePage() {
  const session = await getSession();
  const classes = listClassesForStudent(session!.userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Chào {session!.name} 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Lịch học, tiến độ và nội dung bài học của bạn.</p>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          <p className="text-3xl mb-2">🎵</p>
          <p>Chưa có lớp học nào được gắn với tài khoản của bạn. Liên hệ trung tâm để được hỗ trợ.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {classes.map((c) => {
            const progress = getPackageProgress(c);
            const history = listAttendance({ classId: c.id })
              .filter((a) => a.lesson_content)
              .slice(0, 8);
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    {c.subject}
                    {c.level ? ` · ${c.level}` : ""}
                  </p>
                  <p className="text-sm text-slate-500">
                    {DAY_LABELS[c.day_of_week]} {formatTimeRange(c.start_time, c.duration_minutes)} ·
                    GV: {c.teacher_name || "Chưa xếp"}
                  </p>
                </div>

                {progress && (
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm text-slate-600">
                        Đã học <span className="font-semibold text-slate-900">{progress.used}</span> /{" "}
                        {progress.total} tiết
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          progress.remaining <= 3 ? "text-amber-600" : "text-slate-400"
                        }`}
                      >
                        Còn {progress.remaining} tiết
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          progress.remaining <= 3 ? "bg-amber-500" : "bg-brand-600"
                        }`}
                        style={{ width: `${Math.min(100, (progress.used / progress.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    Nội dung các buổi học gần đây
                  </h3>
                  {history.length === 0 ? (
                    <p className="text-sm text-slate-400">Chưa có nội dung nào được ghi lại.</p>
                  ) : (
                    <ul className="space-y-2">
                      {history.map((a) => (
                        <li key={a.id} className="text-sm border-l-2 border-brand-200 pl-3">
                          <p className="text-slate-500 text-xs">
                            {a.session_date} · {ATTENDANCE_STATUS_LABELS[a.status]}
                          </p>
                          <p className="text-slate-700">{a.lesson_content}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
