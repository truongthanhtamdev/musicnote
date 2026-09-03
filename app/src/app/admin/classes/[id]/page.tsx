import Link from "next/link";
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
  sessionNumberMap,
} from "@/lib/queries";
import { LANGUAGE_LABELS, SOURCE_LABELS, formatClassSchedule } from "@/lib/types";
import { AttendanceStatusCell } from "@/components/attendance-status-cell";
import { IconCalendarCheck, IconChevronLeft, SubjectIcon } from "@/components/icons";
import {
  Avatar,
  Card,
  CardHeader,
  EmptyState,
  StatusChip,
  TableShell,
  Th,
} from "@/components/ui";
import EditClassForm from "./edit-class-form";
import ClassActions from "./class-actions";
import PackageWidget from "./package-widget";
import StudentLinkWidget from "./student-link-widget";

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
  const sessionNumbers = sessionNumberMap([classId]);
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
    <div className="space-y-5">
      <Link
        href="/admin/classes"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <IconChevronLeft className="w-4 h-4" />
        Danh sách lớp học
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <Avatar name={cls.student_name} className="w-12 h-12 text-sm" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">{cls.student_name}</h1>
            {cls.guardian_name && (
              <p className="text-ink-500 text-sm">Khách hàng: {cls.guardian_name}</p>
            )}
            <p className="text-ink-500 text-sm flex flex-wrap items-center gap-x-1.5 mt-0.5">
              <SubjectIcon subject={cls.subject} className="w-4 h-4 text-wood-500" />
              <span className="tabular">{formatClassSchedule(cls)}</span>
              <span className="text-ink-300">·</span>
              {cls.subject}
              <span className="text-ink-300">·</span>
              {LANGUAGE_LABELS[cls.language]}
              <span className="text-ink-300">·</span>
              {SOURCE_LABELS[cls.source]}
            </p>
          </div>
        </div>
        <ClassActions
          classId={cls.id}
          status={cls.status}
          teacherId={cls.teacher_id}
          teachers={teachers}
          canDelete={isAdmin}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card padded={false}>
          <CardHeader title="Thông tin lớp" />
          <div className="p-5">
            <EditClassForm cls={cls} />
          </div>
        </Card>
        <div className="space-y-5">
          <PackageWidget classId={cls.id} progress={progress} siblingsWithPackage={siblings} />
          <StudentLinkWidget
            classId={cls.id}
            currentStudentUserId={cls.student_user_id}
            students={students}
          />
        </div>
      </div>

      <Card padded={false}>
        <CardHeader
          title="Lịch sử điểm danh"
          count={history.length}
          icon={<IconCalendarCheck className="w-4.5 h-4.5 text-navy-600" />}
        />
        {history.length === 0 ? (
          <EmptyState
            icon={<IconCalendarCheck className="w-6 h-6" />}
            title="Chưa có dữ liệu điểm danh"
            description="Các buổi học được điểm danh sẽ hiển thị tại đây."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Ngày</Th>
                <Th>Giáo viên</Th>
                <Th>Trạng thái</Th>
                <Th>Check-in FB</Th>
                <Th>Nội dung bài học</Th>
                <Th>Ghi chú</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {history.map((a) => (
                <tr key={a.id} className="hover:bg-ivory-50">
                  <td className="px-4 py-3 tabular text-ink-700 whitespace-nowrap">
                    {a.session_date}
                  </td>
                  <td className="px-4 py-3 text-ink-700 whitespace-nowrap">{a.teacher_name}</td>
                  <td className="px-4 py-3">
                    <AttendanceStatusCell row={a} sessionNumber={sessionNumbers.get(a.id)} />
                  </td>
                  <td className="px-4 py-3">
                    {a.fb_checkin_confirmed ? (
                      <StatusChip tone="mint">Đã check-in</StatusChip>
                    ) : (
                      <span className="text-ink-400">Chưa</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-600">{a.lesson_content || "–"}</td>
                  <td className="px-4 py-3 text-ink-500">{a.note || "–"}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
