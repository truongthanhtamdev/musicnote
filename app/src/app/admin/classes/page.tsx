import Link from "next/link";
import { listClasses, listTeachers, getPackageProgress, annotateSchedule } from "@/lib/queries";
import { formatTimeRange } from "@/lib/format";
import { DAY_LABELS } from "@/lib/types";
import NewClassForm from "./new-class-form";
import ClassStatusBadge from "./status-badge";

export default async function ClassesPage() {
  const classes = annotateSchedule(listClasses());
  const teachers = listTeachers(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Lớp học ({classes.length})</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">Học sinh</th>
                <th className="px-4 py-2.5 font-medium">Môn / Ngôn ngữ</th>
                <th className="px-4 py-2.5 font-medium">Trình độ</th>
                <th className="px-4 py-2.5 font-medium">Lịch học</th>
                <th className="px-4 py-2.5 font-medium">Buổi tiếp theo</th>
                <th className="px-4 py-2.5 font-medium">Gói học</th>
                <th className="px-4 py-2.5 font-medium">Giáo viên</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map((c) => {
                const progress = getPackageProgress(c);
                return (
                  <tr key={c.id} className={c.missedLastSession ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50"}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {c.student_name}
                      {c.guardian_name && (
                        <span className="block text-xs font-normal text-slate-400">
                          PH: {c.guardian_name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {c.subject}
                      {c.language === "en" && (
                        <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">
                          EN
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{c.level || "-"}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {DAY_LABELS[c.day_of_week]} {formatTimeRange(c.start_time, c.duration_minutes)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-slate-600">{c.nextSessionDate}</span>
                      {c.missedLastSession && (
                        <span className="block text-xs font-medium text-red-600">
                          ⚠ Chưa điểm danh buổi {c.lastDueDate}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {progress ? (
                        <span className={progress.remaining <= 3 ? "text-amber-600 font-medium" : ""}>
                          {progress.used}/{progress.total} tiết
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {c.teacher_name || (
                        <span className="text-amber-600">Chưa xếp GV</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <ClassStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/admin/classes/${c.id}`} className="text-gold-600 hover:underline">
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {classes.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                    Chưa có lớp học nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-xl">
        <h2 className="font-semibold text-slate-900 mb-3">Thêm lớp học mới</h2>
        <NewClassForm teachers={teachers} />
      </div>
    </div>
  );
}
