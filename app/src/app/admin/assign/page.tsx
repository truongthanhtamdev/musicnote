import Link from "next/link";
import {
  listClasses,
  listTeachers,
  isTeacherAvailable,
  teacherSpeaksLanguage,
  teacherTeachesSubject,
} from "@/lib/queries";
import { formatClassSchedule, LANGUAGE_LABELS } from "@/lib/types";
import { IconCheckCircle, SubjectIcon } from "@/components/icons";
import {
  Avatar,
  Card,
  EmptyState,
  PageHeader,
  StatusChip,
  btn,
} from "@/components/ui";
import AssignRow from "./assign-row";

export default async function AssignPage() {
  const unassigned = listClasses({ unassignedOnly: true, status: "active" });
  const teachers = listTeachers(false);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Giao lớp cho giáo viên"
        subtitle={`${unassigned.length} lớp đang chờ xếp giáo viên. Giáo viên được đánh dấu "rảnh" khi khung giờ trống của họ trùng với lịch lớp.`}
      />

      {unassigned.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<IconCheckCircle className="w-7 h-7" />}
            title="Tất cả lớp đang học đều đã có giáo viên"
            description="Khi có lớp mới chưa xếp giáo viên, lớp đó sẽ xuất hiện ở đây."
            action={
              <Link href="/admin/classes" className={btn.secondary}>
                Xem danh sách lớp
              </Link>
            }
          />
        </Card>
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
                isTeacherAvailable(t.id, c.day_of_week, c.start_time, c.duration_minutes, c.id),
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
              <Card key={c.id}>
                <div className="flex items-start gap-3 mb-4">
                  <Avatar name={c.student_name} className="w-10 h-10 text-xs" />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{c.student_name}</p>
                    <p className="text-sm text-ink-500 flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-0.5">
                      <SubjectIcon subject={c.subject} className="w-4 h-4 text-wood-500" />
                      <span className="tabular">{formatClassSchedule(c)}</span>
                      <span className="text-ink-300">·</span>
                      {c.subject}
                      {c.level ? ` · ${c.level}` : ""}
                      {c.language === "en" && (
                        <StatusChip tone="navy">Dạy bằng {LANGUAGE_LABELS.en}</StatusChip>
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
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
