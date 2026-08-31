import {
  listClasses,
  listTeachers,
  isTeacherAvailable,
  teacherSpeaksLanguage,
  teacherTeachesSubject,
} from "@/lib/queries";
import { formatClassSchedule, LANGUAGE_LABELS } from "@/lib/types";
import AssignRow from "./assign-row";

export default async function AssignPage() {
  const unassigned = listClasses({ unassignedOnly: true, status: "active" });
  const teachers = listTeachers(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Giao lớp cho giáo viên</h1>
        <p className="text-slate-500 text-sm mt-1">
          Danh sách lớp chưa có giáo viên ({unassigned.length}). Giáo viên được đánh dấu{" "}
          <span className="text-emerald-600 font-medium">✓ rảnh</span> nếu khung giờ trống của họ
          trùng với lịch lớp.
        </p>
      </div>

      {unassigned.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          Tất cả lớp đang học đều đã có giáo viên phụ trách 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {unassigned.map((c) => {
            const options = teachers.map((t) => ({
              id: t.id,
              name: t.name,
              // A flexible class has no fixed weekly slot to check against —
              // every session is scheduled ad-hoc, so availability doesn't apply.
              available:
                c.schedule_type === "flexible" ||
                isTeacherAvailable(t.id, c.day_of_week, c.start_time, c.duration_minutes),
              speaksLanguage: teacherSpeaksLanguage(t, c.language),
              teachesSubject: teacherTeachesSubject(t, c.subject),
            }));
            options.sort(
              (a, b) =>
                Number(b.available && b.speaksLanguage && b.teachesSubject) -
                  Number(a.available && a.speaksLanguage && a.teachesSubject) ||
                Number(b.available) - Number(a.available)
            );
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-900">{c.student_name}</p>
                    <p className="text-sm text-slate-500">
                      {formatClassSchedule(c)}
                      {c.level ? ` · ${c.level}` : ""} · {c.subject}
                      {c.language === "en" && (
                        <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">
                          Dạy bằng {LANGUAGE_LABELS.en}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <AssignRow
                  classId={c.id}
                  teachers={options}
                  needsLanguage={c.language === "en"}
                  subject={c.subject}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
