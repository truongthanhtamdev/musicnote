import { getSession } from "@/lib/auth";
import { listClassesForTeacher } from "@/lib/queries";
import { formatTimeRange } from "@/lib/format";
import { DAY_LABELS, DAY_ORDER } from "@/lib/types";

export default async function TeacherSchedulePage() {
  const session = await getSession();
  const classes = listClassesForTeacher(session!.userId).filter((c) => c.status === "active");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Lịch dạy trong tuần ({classes.length} lớp)</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {DAY_ORDER.map((d) => {
          const dayClasses = classes.filter((c) => c.day_of_week === d);
          return (
            <div key={d} className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-2">{DAY_LABELS[d]}</h2>
              {dayClasses.length === 0 ? (
                <p className="text-sm text-slate-400">Không có lớp</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {dayClasses.map((c) => (
                    <li key={c.id} className="flex justify-between">
                      <span className="text-slate-800">{c.student_name}</span>
                      <span className="text-slate-500">
                        {formatTimeRange(c.start_time, c.duration_minutes)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
