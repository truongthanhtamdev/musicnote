import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTeacher, listBusySlots, listClassesForTeacher, listAttendance } from "@/lib/queries";
import {
  ATTENDANCE_STATUS_LABELS,
  LANGUAGE_LABELS,
  parseLanguages,
  parseSubjects,
  formatClassSchedule,
} from "@/lib/types";
import { TeacherScheduleGrid } from "@/components/teacher-schedule-grid";
import EditTeacherForm from "./edit-teacher-form";
import ToggleActiveButton from "./toggle-active-button";
import ResetPasswordButton from "@/components/reset-password-button";

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacherId = Number(id);
  const teacher = getTeacher(teacherId);
  if (!teacher) notFound();

  const session = await getSession();
  const isAdmin = session?.role === "admin";

  const busySlots = listBusySlots(teacherId);
  const classes = listClassesForTeacher(teacherId);
  const attendance = listAttendance({ teacherId }).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{teacher.name}</h1>
          <p className="text-slate-500 text-sm">{teacher.email}</p>
        </div>
        {isAdmin && <ToggleActiveButton teacherId={teacher.id} active={!!teacher.active} />}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {isAdmin ? (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Thông tin</h2>
            <EditTeacherForm teacher={teacher} />
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
              <ResetPasswordButton userId={teacher.id} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm space-y-2">
            <h2 className="font-semibold text-slate-900 mb-2">Thông tin</h2>
            <p>
              <span className="text-slate-500">SĐT:</span> {teacher.phone || "-"}
            </p>
            <p>
              <span className="text-slate-500">Chuyên môn:</span>{" "}
              {parseSubjects(teacher.subjects).join(", ") || "Chưa khai báo"}
            </p>
            <p>
              <span className="text-slate-500">Ngôn ngữ dạy:</span>{" "}
              {parseLanguages(teacher.languages)
                .map((l) => LANGUAGE_LABELS[l])
                .join(", ")}
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900 mb-3">Lớp đang phụ trách ({classes.length})</h2>
          {classes.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa được giao lớp nào.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {classes.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{c.student_name}</span>
                  <span className="text-slate-500">{formatClassSchedule(c)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-900 mb-3">Bảng lịch</h2>
        <TeacherScheduleGrid
          teacherId={teacher.id}
          classes={classes}
          busySlots={busySlots}
          mode="admin"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Lịch sử điểm danh gần đây</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Ngày</th>
                <th className="px-4 py-2 font-medium">Học sinh</th>
                <th className="px-4 py-2 font-medium">Trạng thái</th>
                <th className="px-4 py-2 font-medium">Giờ điểm danh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2">{a.session_date}</td>
                  <td className="px-4 py-2">{a.student_name}</td>
                  <td className="px-4 py-2">{ATTENDANCE_STATUS_LABELS[a.status]}</td>
                  <td className="px-4 py-2 text-slate-500">{a.check_in_time || "-"}</td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
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
