import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getClass,
  listTeachers,
  listAttendance,
  isTeacherAvailable,
  listStudents,
  getPackageProgress,
  listSiblingClasses,
} from "@/lib/queries";
import { LANGUAGE_LABELS, SOURCE_LABELS, formatClassSchedule } from "@/lib/types";
import { AttendanceStatusCell } from "@/components/attendance-status-cell";
import EditClassForm from "./edit-class-form";
import ClassActions from "./class-actions";
import PackageWidget from "./package-widget";
import StudentLinkWidget from "./student-link-widget";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const classId = Number(id);
  const cls = getClass(classId);
  if (!cls) notFound();

  const session = await getSession();
  const isAdmin = session?.role === "admin";

  const teachers = listTeachers(false).map((t) => ({
    ...t,
    available:
      cls.schedule_type === "flexible" ||
      isTeacherAvailable(t.id, cls.day_of_week, cls.start_time, cls.duration_minutes, cls.id),
  }));
  const history = listAttendance({ classId }).slice(0, 30);
  const students = listStudents();
  const progress = getPackageProgress(cls);
  const siblings = listSiblingClasses(cls)
    .filter((s) => s.package_id)
    .map((s) => ({
      id: s.id,
      label: formatClassSchedule(s),
      progress: getPackageProgress(s)!,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{cls.student_name}</h1>
          {cls.guardian_name && (
            <p className="text-slate-500 text-sm">Phụ huynh: {cls.guardian_name}</p>
          )}
          <p className="text-slate-500 text-sm">
            {formatClassSchedule(cls)} · {cls.subject} · {LANGUAGE_LABELS[cls.language]} ·{" "}
            {SOURCE_LABELS[cls.source]}
          </p>
        </div>
        <ClassActions classId={cls.id} status={cls.status} teacherId={cls.teacher_id} teachers={teachers} canDelete={isAdmin} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900 mb-3">Thông tin lớp</h2>
          <EditClassForm cls={cls} />
        </div>
        <div className="space-y-6">
          <PackageWidget classId={cls.id} progress={progress} siblingsWithPackage={siblings} />
          <StudentLinkWidget
            classId={cls.id}
            currentStudentUserId={cls.student_user_id}
            students={students}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Lịch sử điểm danh</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Ngày</th>
                <th className="px-4 py-2 font-medium">Giáo viên</th>
                <th className="px-4 py-2 font-medium">Trạng thái</th>
                <th className="px-4 py-2 font-medium">FB</th>
                <th className="px-4 py-2 font-medium">Nội dung bài học</th>
                <th className="px-4 py-2 font-medium">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2">{a.session_date}</td>
                  <td className="px-4 py-2">{a.teacher_name}</td>
                  <td className="px-4 py-2">
                    <AttendanceStatusCell row={a} />
                  </td>
                  <td className="px-4 py-2">{a.fb_checkin_confirmed ? "✔" : "-"}</td>
                  <td className="px-4 py-2 text-slate-600">{a.lesson_content || "-"}</td>
                  <td className="px-4 py-2 text-slate-500">{a.note || "-"}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Chưa có dữ liệu điểm danh.
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
