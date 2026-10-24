import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { getSession } from "@/lib/auth";
import {
  listClasses,
  listPlannedSessions,
  listTeachers,
  isTeacherAvailable,
  teacherSpeaksLanguage,
  teacherTeachesSubject,
} from "@/lib/queries";
import { DAY_LABELS, formatClassSchedule, LANGUAGE_LABELS, MANAGE_ROLES } from "@/lib/types";
import { addDays, nextOccurrence, toISODate, todayISO } from "@/lib/format";
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
import DeleteClassButton from "../classes/delete-class-button";
import ToLeadButton from "./to-lead-button";

export default async function AssignPage() {
  // Trang lớp học: nhân viên đặt hẹn không vào, chỉ Quản lý trở lên.
  await requireRole(MANAGE_ROLES);
  const session = await getSession();
  // Buổi học đầu của từng lớp: ngày bắt đầu nếu còn ở phía trước, không ghi
  // ngày thì lấy buổi gần nhất đúng thứ đó; lớp linh động lấy buổi hẹn đầu tiên.
  // Lớp học sớm nhất lên đầu — cần giao giáo viên trước.
  const today = todayISO();
  const until = toISODate(addDays(new Date(`${today}T00:00:00`), 60));
  const firstDate = (c: ReturnType<typeof listClasses>[number]): string | null =>
    c.schedule_type === "flexible"
      ? (listPlannedSessions(c.id, today, until)[0]?.session_date ?? null)
      : c.start_date && c.start_date > today
        ? c.start_date
        : toISODate(nextOccurrence(c.day_of_week));
  const unassigned = listClasses({ unassignedOnly: true, status: "active" })
    .map((c) => ({ ...c, firstDate: firstDate(c) }))
    .sort((a, b) =>
      a.firstDate && b.firstDate ? a.firstDate.localeCompare(b.firstDate) : a.firstDate ? -1 : b.firstDate ? 1 : 0
    );
  const tomorrow = toISODate(addDays(new Date(`${today}T00:00:00`), 1));
  const dateLabel = (d: string) =>
    `${d === today ? "Hôm nay · " : d === tomorrow ? "Ngày mai · " : ""}${DAY_LABELS[new Date(`${d}T00:00:00`).getDay()]} ${d.slice(8, 10)}/${d.slice(5, 7)}`;
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
            // Không một giáo viên nào khai dạy môn này thì gần như chắc chắn
            // tên môn bị gõ sai, chứ trung tâm không nhận lớp môn không ai dạy.
            // Không nói ra thì người xem chỉ thấy cả danh sách đỏ lòm "chưa
            // dạy ..." mà không hiểu vì sao.
            const nobodyTeaches = options.length > 0 && options.every((o) => !o.teachesSubject);
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
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900">{c.student_name}</p>
                    <p className="text-sm text-ink-500 flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-0.5">
                      <SubjectIcon subject={c.subject} className="w-4 h-4 text-wood-500" />
                      <span className="tabular">{formatClassSchedule({ ...c, start_date: null })}</span>
                      <span className="text-ink-300">·</span>
                      <span
                        className={`tabular font-semibold ${
                          c.firstDate && c.firstDate <= tomorrow ? "text-coral-600" : "text-ink-700"
                        }`}
                      >
                        {c.firstDate ? `Buổi đầu ${dateLabel(c.firstDate)}` : "Chưa hẹn buổi nào"}
                      </span>
                      <span className="text-ink-300">·</span>
                      {c.subject}
                      {c.level ? ` · ${c.level}` : ""}
                      {c.language === "en" && (
                        <StatusChip tone="navy">Dạy bằng {LANGUAGE_LABELS.en}</StatusChip>
                      )}
                    </p>
                  </div>
                  {/* Sửa/xoá ngay tại đây: lớp chưa có giáo viên thường là lớp
                      vừa nhập, sai giờ hoặc trùng thì phải chỉnh được liền chứ
                      không phải mò sang trang khác. */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Khách nhập vội thành lớp nhưng chưa chốt gì thì trả về
                        Khách tiềm năng cho có người nhắc chăm — nằm ở đây
                        không ai hẹn gọi lại cả. */}
                    <ToLeadButton classId={c.id} />
                    <Link
                      href={`/admin/classes/${c.id}`}
                      className="text-sm font-semibold text-wood-600 hover:text-wood-700 border border-navy-200 rounded-lg px-3 py-1.5"
                    >
                      Sửa lớp
                    </Link>
                    {(session?.role === "admin" || session?.role === "manager") && <DeleteClassButton classId={c.id} />}
                  </div>
                </div>
                {nobodyTeaches && (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Không giáo viên nào khai dạy môn{" "}
                    <span className="font-semibold">{c.subject}</span> — nhiều khả năng tên môn bị
                    gõ sai. Bấm <span className="font-semibold">Sửa lớp</span> để chọn lại, hoặc bổ
                    sung môn này cho giáo viên ở trang Giáo viên.
                  </div>
                )}
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
