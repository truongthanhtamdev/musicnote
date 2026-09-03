import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  listAttendance,
  listClassesForTeacher,
  getClass,
  sessionNumberMap,
} from "@/lib/queries";
import { addDays, toISODate, todayISO } from "@/lib/format";
import { formatClassSchedule, CLASS_STATUS_LABELS } from "@/lib/types";
import { IconCalendarCheck, IconCheckCircle, IconFilter } from "@/components/icons";
import {
  Card,
  EmptyState,
  MetricCard,
  PageHeader,
  TableShell,
  Th,
  btn,
  field,
  label,
} from "@/components/ui";
import MakeupAttendanceForm from "./makeup-attendance-form";
import TeacherAttendanceHistoryRow from "./history-row";

export default async function TeacherAttendanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; classId?: string }>;
}) {
  const session = await getSession();
  const sp = await searchParams;
  const classId = sp.classId ? Number(sp.classId) : undefined;
  // Filtering to one student's own history should show all of it, not
  // just the default 30-day window everyone else's combined log uses —
  // omitting `from` entirely (rather than a fake early sentinel date)
  // already means "no lower bound" to listAttendance.
  const from = sp.from || (classId ? undefined : toISODate(addDays(new Date(), -30)));
  const to = sp.to || todayISO();

  const rows = listAttendance({ teacherId: session!.userId, from, to, classId });
  const sessionNumbers = sessionNumberMap([...new Set(rows.map((r) => r.class_id))]);
  // Not filtered to active classes — a teacher may still need to add or
  // correct attendance for a class that has since paused or ended.
  const myClasses = listClassesForTeacher(session!.userId).map((c) => ({
    id: c.id,
    label: `${c.student_name} · ${formatClassSchedule(c)}${
      c.status === "active" ? "" : ` (${CLASS_STATUS_LABELS[c.status]})`
    }`,
  }));
  // The filtered rows already carry the student's name; only fall back to
  // a lookup when there's no attendance yet to read it from.
  const filteredStudentName = classId
    ? (rows[0]?.student_name ?? getClass(classId)?.student_name)
    : null;

  const taught = rows.filter((r) => r.status === "completed").length;
  const trials = rows.filter((r) => r.is_trial).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lịch sử điểm danh"
        subtitle={
          filteredStudentName ? (
            <>
              Đang xem riêng học viên{" "}
              <span className="font-semibold text-wood-700">{filteredStudentName}</span> ·{" "}
              <Link href="/teacher/attendance" className="text-wood-600 hover:underline">
                xem tất cả học viên
              </Link>
            </>
          ) : (
            "Toàn bộ buổi bạn đã ghi nhận, kể cả buổi học bù và buổi học thử."
          )
        }
        action={<MakeupAttendanceForm classes={myClasses} />}
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <MetricCard
          label="Tổng buổi ghi nhận"
          value={rows.length}
          unit="buổi"
          icon={<IconCalendarCheck className="w-5 h-5" />}
        />
        <MetricCard
          label="Đã dạy"
          value={taught}
          unit="buổi"
          tone="mint"
          icon={<IconCheckCircle className="w-5 h-5" />}
        />
        <MetricCard label="Buổi học thử" value={trials} unit="buổi" tone="wood" />
      </div>

      <Card padded={false}>
        <form className="p-4 border-b border-navy-100 flex flex-wrap gap-3 items-end">
          {classId && <input type="hidden" name="classId" value={classId} />}
          <div>
            <label className={label} htmlFor="t-from">
              Từ ngày
            </label>
            <input
              id="t-from"
              type="date"
              name="from"
              defaultValue={from || ""}
              className={`${field} w-auto`}
            />
          </div>
          <div>
            <label className={label} htmlFor="t-to">
              Đến ngày
            </label>
            <input id="t-to" type="date" name="to" defaultValue={to} className={`${field} w-auto`} />
          </div>
          <button type="submit" className={btn.primary}>
            <IconFilter className="w-4 h-4" />
            Lọc
          </button>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            icon={<IconCalendarCheck className="w-6 h-6" />}
            title="Chưa có buổi nào trong khoảng này"
            description="Thử mở rộng khoảng ngày, hoặc thêm buổi học bù nếu bạn vừa dạy ngoài lịch."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Ngày</Th>
                <Th>Học viên</Th>
                <Th>Trạng thái</Th>
                <Th>Giờ điểm danh</Th>
                <Th>Nội dung bài học</Th>
                <Th>Ghi chú</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {rows.map((a) => (
                <TeacherAttendanceHistoryRow
                  key={a.id}
                  row={a}
                  sessionNumber={sessionNumbers.get(a.id)}
                />
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
