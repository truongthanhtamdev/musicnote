import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTeacher, listBusySlots, listClassesForTeacher, listAttendance } from "@/lib/queries";
import {
  LANGUAGE_LABELS,
  parseLanguages,
  parseSubjects,
  formatClassSchedule,
} from "@/lib/types";
import { TeacherScheduleGrid } from "@/components/teacher-schedule-grid";
import { AttendanceStatusCell } from "@/components/attendance-status-cell";
import { IconCalendarCheck, IconChevronLeft, IconClasses, IconClock } from "@/components/icons";
import {
  Avatar,
  Card,
  CardHeader,
  EmptyState,
  TableShell,
  Th,
} from "@/components/ui";
import EditTeacherForm from "./edit-teacher-form";
import ToggleActiveButton from "./toggle-active-button";
import ResetPasswordButton from "@/components/reset-password-button";

export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="space-y-5">
      <Link
        href="/admin/teachers"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <IconChevronLeft className="w-4 h-4" />
        Danh sách giáo viên
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <Avatar name={teacher.name} className="w-12 h-12 text-sm" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">{teacher.name}</h1>
            <p className="text-ink-500 text-sm">{teacher.email}</p>
            <p className="text-ink-500 text-sm mt-0.5">
              {parseSubjects(teacher.subjects).join(", ") || "Chưa khai báo chuyên môn"} ·{" "}
              {parseLanguages(teacher.languages)
                .map((l) => LANGUAGE_LABELS[l])
                .join(", ")}
            </p>
          </div>
        </div>
        {isAdmin && <ToggleActiveButton teacherId={teacher.id} active={!!teacher.active} />}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card padded={false}>
          <CardHeader title="Thông tin giáo viên" />
          <div className="p-5">
            {isAdmin ? (
              <>
                <EditTeacherForm teacher={teacher} />
                <div className="mt-4 pt-4 border-t border-navy-100 flex justify-end">
                  <ResetPasswordButton userId={teacher.id} />
                </div>
              </>
            ) : (
              <dl className="text-sm space-y-2.5">
                <div className="flex gap-3">
                  <dt className="text-ink-500 w-28 shrink-0">SĐT</dt>
                  <dd className="text-ink-900 tabular">{teacher.phone || "–"}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="text-ink-500 w-28 shrink-0">Chuyên môn</dt>
                  <dd className="text-ink-900">
                    {parseSubjects(teacher.subjects).join(", ") || "Chưa khai báo"}
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="text-ink-500 w-28 shrink-0">Ngôn ngữ dạy</dt>
                  <dd className="text-ink-900">
                    {parseLanguages(teacher.languages)
                      .map((l) => LANGUAGE_LABELS[l])
                      .join(", ")}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </Card>

        <Card padded={false}>
          <CardHeader
            title="Lớp đang phụ trách"
            count={classes.length}
            icon={<IconClasses className="w-4.5 h-4.5 text-wood-500" />}
          />
          {classes.length === 0 ? (
            <EmptyState
              icon={<IconClasses className="w-6 h-6" />}
              title="Chưa được giao lớp nào"
              description="Giao lớp cho giáo viên này ở trang Giao lớp."
            />
          ) : (
            <ul className="divide-y divide-navy-100 max-h-80 overflow-y-auto scroll-thin">
              {classes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/classes/${c.id}`}
                    className="px-5 py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-ivory-50 transition"
                  >
                    <span className="font-medium text-ink-900 truncate">{c.student_name}</span>
                    <span className="text-ink-500 tabular shrink-0">{formatClassSchedule(c)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card padded={false}>
        <CardHeader
          title="Lịch tuần của giáo viên"
          icon={<IconClock className="w-4.5 h-4.5 text-navy-600" />}
          action={<span className="text-xs text-ink-400">Bấm ô trống để thêm lớp</span>}
        />
        <div className="p-5">
          <TeacherScheduleGrid
            teacherId={teacher.id}
            classes={classes}
            busySlots={busySlots}
            mode="admin"
          />
        </div>
      </Card>

      <Card padded={false}>
        <CardHeader
          title="Lịch sử điểm danh gần đây"
          count={attendance.length}
          icon={<IconCalendarCheck className="w-4.5 h-4.5 text-navy-600" />}
        />
        {attendance.length === 0 ? (
          <EmptyState
            icon={<IconCalendarCheck className="w-6 h-6" />}
            title="Chưa có dữ liệu điểm danh"
            description="Các buổi giáo viên đã điểm danh sẽ hiển thị tại đây."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Ngày</Th>
                <Th>Học viên</Th>
                <Th>Trạng thái</Th>
                <Th>Giờ điểm danh</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {attendance.map((a) => (
                <tr key={a.id} className="hover:bg-ivory-50">
                  <td className="px-4 py-3 tabular text-ink-700 whitespace-nowrap">
                    {a.session_date}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-900">{a.student_name}</td>
                  <td className="px-4 py-3">
                    <AttendanceStatusCell row={a} />
                  </td>
                  <td className="px-4 py-3 tabular text-ink-500">{a.check_in_time || "–"}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
