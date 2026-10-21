import { getSession } from "@/lib/auth";
import { addDays, formatTimeRange, now, toISODate, todayISO } from "@/lib/format";
import {
  listClassesForTeacher,
  getPackageProgressForClasses,
  listTeacherFreeSlots,
  listUpcomingSessionsForTeacher,
  listPlannedSessions,
  plannedClassesOn,
} from "@/lib/queries";
import { DAY_LABELS, DAY_ORDER, MAKEUP_WINDOW_DAYS, teacherSees } from "@/lib/types";
import { IconClasses, IconClock } from "@/components/icons";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import NewClassForm from "./new-class-form";
import TeacherClassRow from "./class-row";
import ReschedulePanel from "../reschedule-panel";

export default async function TeacherSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await getSession();
  const editId = Number((await searchParams).edit) || 0;
  const activeClasses = listClassesForTeacher(session!.userId)
    .filter((c) => c.status === "active")
    .map(teacherSees);
  const progressByPackage = getPackageProgressForClasses(activeClasses);
  const classes = activeClasses.map((c) => ({
    ...c,
    progress: c.package_id ? (progressByPackage.get(c.package_id) ?? null) : null,
  }));
  const flexibleClasses = classes.filter((c) => c.schedule_type === "flexible");
  // Lịch tháng của lớp linh động: đầu tháng này → hết tháng sau.
  const todayStr = todayISO();
  const monthStart = `${todayStr.slice(0, 7)}-01`;
  const end = new Date(`${monthStart}T00:00:00`);
  end.setMonth(end.getMonth() + 2, 0);
  const rangeEnd = toISODate(end);
  const todayDow = now().getDay();
  // Buổi hẹn của lớp linh động rơi vào tuần này (T2 → CN), hiện chung cột thứ.
  const monday = addDays(now(), -((todayDow + 6) % 7));
  const weekPlanned = new Map(
    DAY_ORDER.map((d) => {
      const date = toISODate(addDays(monday, (d + 6) % 7));
      return [d, { date, rows: plannedClassesOn(date, session!.userId).map(teacherSees) }] as const;
    })
  );

  // Buổi sắp tới + khung còn trống, để giáo viên dời giúp khách ngay tại đây.
  const upcoming = listUpcomingSessionsForTeacher(session!.userId).map((g) => ({
    ...g,
    customer: g.sessions[0]?.cls.teacher_label || g.customer,
    sessions: g.sessions.map((s) => ({ ...s, cls: teacherSees(s.cls) })),
  }));
  const freeSlots = listTeacherFreeSlots({
    teacherId: session!.userId,
    durationMinutes: 60,
    days: MAKEUP_WINDOW_DAYS,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lịch dạy trong tuần"
        subtitle={`Bạn đang có ${classes.length} lớp. Có học viên mới? Thêm lớp — hệ thống sẽ tự gán lớp đó cho bạn.`}
        action={<NewClassForm />}
      />

      {upcoming.length > 0 && (
        <Card padded={false}>
          <CardHeader
            icon={<IconClock className="w-5 h-5" />}
            title="Dời buổi cho khách"
            count={upcoming.length}
          />
          <div className="p-4 sm:p-5">
            <p className="text-sm text-ink-500 mb-4">
              Khách nhắn xin dời thì bạn nhập thẳng ở đây. Buổi sắp tới của từng khách để cạnh
              nhau — xin dời cả tuần thì dời một lượt.
            </p>
            <ReschedulePanel groups={upcoming} freeSlots={freeSlots} />
          </div>
        </Card>
      )}

      {classes.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<IconClasses className="w-7 h-7" />}
            title="Chưa có lớp nào trong tuần"
            description="Thêm lớp đầu tiên để bắt đầu theo dõi lịch dạy và điểm danh."
            action={<NewClassForm />}
          />
        </Card>
      ) : (
        <>
          {flexibleClasses.length > 0 && (
            <Card padded={false}>
              <CardHeader
                title="Lớp linh động"
                count={flexibleClasses.length}
                icon={<IconClock className="w-4.5 h-4.5 text-wood-500" />}
              />
              <p className="px-5 pt-3 text-xs text-ink-500">
                Không có lịch cố định — bấm &quot;Xếp lịch tháng&quot; chọn các ngày học. Buổi đã xếp hiện
                ở cột thứ bên dưới và ở trang Hôm nay đúng ngày đó để điểm danh như lớp thường.
              </p>
              <ul className="divide-y divide-navy-100 mt-1">
                {flexibleClasses.map((c) => (
                  <TeacherClassRow
                    key={c.id}
                    cls={c}
                    progress={c.progress}
                    autoEdit={c.id === editId}
                    planned={listPlannedSessions(c.id, monthStart, rangeEnd)}
                    today={todayStr}
                  />
                ))}
              </ul>
            </Card>
          )}

          <div className="grid grid-cols-1 [&>*]:min-w-0 gap-4 sm:grid-cols-2">
            {DAY_ORDER.map((d) => {
              const dayClasses = classes
                .filter((c) => c.schedule_type !== "flexible" && c.day_of_week === d)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));
              const isToday = d === todayDow;
              const planned = weekPlanned.get(d)!;
              return (
                <Card
                  key={d}
                  padded={false}
                  className={isToday ? "border-wood-300 ring-1 ring-wood-200" : ""}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-navy-100">
                    <h2 className="font-semibold text-ink-900 flex items-center gap-2">
                      {DAY_LABELS[d]}
                      {isToday && (
                        <span className="text-[11px] font-bold uppercase tracking-wide text-wood-700 bg-wood-50 border border-wood-100 rounded-full px-2 py-0.5">
                          Hôm nay
                        </span>
                      )}
                    </h2>
                    <span className="text-xs text-ink-400 tabular">
                      {planned.date.slice(8)}/{planned.date.slice(5, 7)} · {dayClasses.length + planned.rows.length} lớp
                    </span>
                  </div>
                  {dayClasses.length === 0 && planned.rows.length === 0 ? (
                    <p className="text-sm text-ink-400 px-4 py-5 text-center">Không có lớp</p>
                  ) : (
                    <ul className="divide-y divide-navy-100">
                      {dayClasses.map((c) => (
                        <TeacherClassRow key={c.id} cls={c} progress={c.progress} autoEdit={c.id === editId} />
                      ))}
                      {planned.rows.map((c) => (
                        <li key={`p${c.id}`} className="px-4 py-3 bg-wood-50/50">
                          <p className="font-semibold text-ink-900">{c.student_name}</p>
                          <p className="text-sm text-ink-600 tabular">
                            {formatTimeRange(c.start_time, c.duration_minutes)} · {c.subject}
                            <span className="ml-1.5 rounded-full bg-wood-100 px-2 py-0.5 text-[11px] font-semibold text-wood-700">
                              Linh động · buổi hẹn
                            </span>
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
