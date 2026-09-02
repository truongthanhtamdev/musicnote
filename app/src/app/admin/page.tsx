import Link from "next/link";
import { db } from "@/lib/db";
import {
  listClassesByDay,
  listAttendance,
  listClasses,
  listPackagesNearingCompletion,
} from "@/lib/queries";
import { formatTimeRange, todayISO, toISODate, addDays } from "@/lib/format";
import { DAY_LABELS } from "@/lib/types";
import {
  IconAlert,
  IconCalendarCheck,
  IconChart,
  IconCheckCircle,
  IconClasses,
  IconClock,
  IconPackage,
  IconTeacher,
  IconUsers,
  SubjectIcon,
} from "@/components/icons";
import {
  Avatar,
  Card,
  CardHeader,
  DetailLink,
  EmptyState,
  MetricCard,
  PageHeader,
  ProgressBar,
  StatusChip,
  btn,
  packageTone,
} from "@/components/ui";

function endMinutes(startTime: string, durationMinutes: number): number {
  const [h, m] = startTime.split(":").map(Number);
  return h * 60 + m + durationMinutes;
}

function hhmm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

/** Số tiết theo lịch và số tiết đã ghi nhận điểm danh trong 7 ngày gần nhất. */
function weeklyStats() {
  const activeClasses = listClasses({ status: "active" });
  const days: { label: string; date: string; scheduled: number; taught: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const date = toISODate(d);
    const scheduled = activeClasses.filter(
      (c) =>
        c.schedule_type === "fixed" &&
        c.day_of_week === d.getDay() &&
        c.created_at.slice(0, 10) <= date
    ).length;
    const taught = (
      db.prepare("SELECT COUNT(*) as c FROM attendance WHERE session_date = ?").get(date) as {
        c: number;
      }
    ).c;
    days.push({
      label: DAY_LABELS[d.getDay()],
      date: date.slice(5).replace("-", "/"),
      scheduled,
      taught,
    });
  }
  return days;
}

export default async function AdminDashboard() {
  const teacherCount = (
    db.prepare("SELECT COUNT(*) as c FROM users WHERE role='teacher' AND active=1").get() as {
      c: number;
    }
  ).c;
  const activeClassCount = (
    db.prepare("SELECT COUNT(*) as c FROM classes WHERE status='active'").get() as { c: number }
  ).c;
  const unassignedCount = (
    db
      .prepare("SELECT COUNT(*) as c FROM classes WHERE status='active' AND teacher_id IS NULL")
      .get() as { c: number }
  ).c;

  const today = new Date();
  const dow = today.getDay();
  const todayStr = todayISO();
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  const todaysClasses = listClassesByDay(dow);
  const todaysAttendance = listAttendance({ from: todayStr, to: todayStr });
  const marked = new Set(todaysAttendance.map((a) => a.class_id));

  const overdue = todaysClasses
    .filter((c) => !marked.has(c.id) && nowMinutes > endMinutes(c.start_time, c.duration_minutes))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const doneCount = todaysClasses.filter((c) => marked.has(c.id)).length;
  const pendingCount = todaysClasses.length - doneCount - overdue.length;
  const donePct = todaysClasses.length
    ? Math.round((doneCount / todaysClasses.length) * 1000) / 10
    : 0;

  const nearingCompletion = listPackagesNearingCompletion();
  const week = weeklyStats();
  const maxBar = Math.max(1, ...week.map((d) => d.scheduled));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan"
        subtitle={`Hôm nay là ${DAY_LABELS[dow]}, ${todayStr}`}
        action={
          <Link href="/admin/attendance" className={btn.secondary}>
            <IconCalendarCheck className="w-4 h-4" />
            Kiểm tra điểm danh
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Lớp hôm nay"
          value={todaysClasses.length}
          unit="tiết"
          icon={<IconCalendarCheck className="w-5 h-5" />}
          tone="navy"
          href="/admin/classes"
        />
        <MetricCard
          label="Đã điểm danh"
          value={doneCount}
          unit="tiết"
          hint={`${donePct}% số tiết hôm nay`}
          icon={<IconCheckCircle className="w-5 h-5" />}
          tone="mint"
          href="/admin/attendance"
        />
        <MetricCard
          label="Chưa điểm danh"
          value={pendingCount + overdue.length}
          unit="tiết"
          hint={overdue.length ? `${overdue.length} tiết đã quá giờ` : "Chưa tới giờ dạy"}
          icon={<IconClock className="w-5 h-5" />}
          tone={overdue.length ? "coral" : "amber"}
        />
        <MetricCard
          label="Sắp hết gói"
          value={nearingCompletion.length}
          unit="học viên"
          hint="Còn 3 tiết trở xuống"
          icon={<IconPackage className="w-5 h-5" />}
          tone="wood"
          href="/admin/packages"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <MetricCard
          label="Giáo viên đang hoạt động"
          value={teacherCount}
          unit="người"
          icon={<IconTeacher className="w-5 h-5" />}
          href="/admin/teachers"
        />
        <MetricCard
          label="Lớp đang học"
          value={activeClassCount}
          unit="lớp"
          icon={<IconClasses className="w-5 h-5" />}
          href="/admin/classes"
        />
        <MetricCard
          label="Lớp chưa có giáo viên"
          value={unassignedCount}
          unit="lớp"
          tone={unassignedCount ? "amber" : "navy"}
          icon={<IconUsers className="w-5 h-5" />}
          href="/admin/assign"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Cần xử lý hôm nay */}
        <Card padded={false}>
          <CardHeader
            title="Cần xử lý hôm nay"
            count={overdue.length}
            tone="warning"
            icon={<IconAlert className="w-4.5 h-4.5" />}
          />
          {overdue.length === 0 ? (
            <EmptyState
              icon={<IconCheckCircle className="w-6 h-6" />}
              title="Không có tiết nào quá hạn"
              description="Mọi lớp đã qua giờ đều đã được điểm danh."
            />
          ) : (
            <>
              <p className="px-5 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Điểm danh quá hạn
              </p>
              <ul className="divide-y divide-navy-100">
                {overdue.slice(0, 6).map((c) => (
                  <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-sm font-semibold text-ink-900 tabular w-11 shrink-0">
                      {c.start_time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-900 truncate">{c.student_name}</p>
                      <p className="text-xs text-ink-500 flex items-center gap-1">
                        <SubjectIcon subject={c.subject} className="w-3.5 h-3.5" />
                        {c.subject} · {c.teacher_name || "Chưa có GV"}
                      </p>
                    </div>
                    <StatusChip tone="coral">
                      Hạn {hhmm(endMinutes(c.start_time, c.duration_minutes))}
                    </StatusChip>
                  </li>
                ))}
              </ul>
              <div className="px-5 py-3 border-t border-navy-100 flex gap-2">
                <Link href="/admin/attendance" className={`${btn.secondary} flex-1`}>
                  Xem điểm danh
                </Link>
                <Link href="/admin/classes" className={`${btn.primary} flex-1`}>
                  Xem lớp học
                </Link>
              </div>
            </>
          )}
        </Card>

        {/* Học viên sắp hết khóa */}
        <Card padded={false}>
          <CardHeader
            title="Học viên sắp hết khóa"
            count={nearingCompletion.length}
            icon={<IconPackage className="w-4.5 h-4.5 text-wood-500" />}
          />
          {nearingCompletion.length === 0 ? (
            <EmptyState
              icon={<IconPackage className="w-6 h-6" />}
              title="Chưa có gói nào sắp hết"
              description="Tất cả học viên đều còn trên 3 tiết."
            />
          ) : (
            <>
              <ul className="divide-y divide-navy-100">
                {nearingCompletion.slice(0, 5).map((row) => (
                  <li key={row.packageId}>
                    <Link
                      href={`/admin/classes/${row.id}`}
                      className="px-5 py-3 flex items-center gap-3 hover:bg-ivory-50 transition"
                    >
                      <Avatar name={row.student_name} className="w-9 h-9 text-xs" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-900 truncate">
                          {row.student_name}
                        </p>
                        <p className="text-xs text-ink-500 mb-1 truncate">
                          {row.subject} · GV: {row.teacher_name || "Chưa xếp"}
                        </p>
                        <ProgressBar
                          value={row.used}
                          max={row.total}
                          tone={packageTone(row.remaining)}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular shrink-0 text-coral-600">
                        còn {row.remaining} tiết
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="px-5 py-3 border-t border-navy-100">
                <Link href="/admin/packages" className={`${btn.secondary} w-full`}>
                  Xem tất cả gói học
                </Link>
              </div>
            </>
          )}
        </Card>

        {/* Tổng quan tuần này */}
        <Card padded={false}>
          <CardHeader
            title="Tổng quan tuần này"
            icon={<IconChart className="w-4.5 h-4.5 text-navy-600" />}
            action={<span className="text-xs text-ink-400">7 ngày qua</span>}
          />
          <div className="px-5 pt-4">
            <div className="flex items-center gap-4 text-xs text-ink-500 mb-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-mint-500" aria-hidden="true" />
                Đã điểm danh
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-coral-300" aria-hidden="true" />
                Chưa điểm danh
              </span>
            </div>
            <div className="flex items-end justify-between gap-1.5 h-36">
              {week.map((d) => {
                const missing = Math.max(0, d.scheduled - d.taught);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                    <div className="flex-1 w-full flex items-end justify-center gap-1">
                      <span
                        className="w-2.5 rounded-t bg-mint-500"
                        style={{ height: `${(d.taught / maxBar) * 100}%` }}
                        title={`${d.taught} tiết đã điểm danh`}
                      />
                      <span
                        className="w-2.5 rounded-t bg-coral-300"
                        style={{ height: `${(missing / maxBar) * 100}%` }}
                        title={`${missing} tiết chưa điểm danh`}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-ink-500">{d.label}</span>
                    <span className="text-[10px] text-ink-400 tabular">{d.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="px-5 py-3 mt-2 border-t border-navy-100 text-sm text-ink-500 tabular">
            Tổng {week.reduce((s, d) => s + d.taught, 0)} tiết đã điểm danh /{" "}
            {week.reduce((s, d) => s + d.scheduled, 0)} tiết theo lịch
          </div>
        </Card>
      </div>

      {/* Lịch hôm nay */}
      <Card padded={false}>
        <CardHeader
          title="Lớp học hôm nay"
          count={todaysClasses.length}
          icon={<IconCalendarCheck className="w-4.5 h-4.5 text-navy-600" />}
          action={<DetailLink href="/admin/attendance">Xem toàn bộ điểm danh</DetailLink>}
        />
        {todaysClasses.length === 0 ? (
          <EmptyState
            icon={<IconCalendarCheck className="w-6 h-6" />}
            title="Không có lớp nào hôm nay"
            description="Lịch dạy hôm nay đang trống."
          />
        ) : (
          <ul className="divide-y divide-navy-100">
            {todaysClasses.map((c) => {
              const done = marked.has(c.id);
              const late = !done && nowMinutes > endMinutes(c.start_time, c.duration_minutes);
              return (
                <li
                  key={c.id}
                  className={`px-5 py-3 flex items-center gap-3 ${late ? "bg-coral-50/50" : ""}`}
                >
                  <span className="text-sm font-semibold text-ink-900 tabular w-24 shrink-0">
                    {formatTimeRange(c.start_time, c.duration_minutes)}
                  </span>
                  <Avatar name={c.student_name} className="w-8 h-8 text-[11px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 truncate">{c.student_name}</p>
                    <p className="text-xs text-ink-500 flex items-center gap-1">
                      <SubjectIcon subject={c.subject} className="w-3.5 h-3.5" />
                      {c.subject} · {c.teacher_name || "Chưa có GV"}
                    </p>
                  </div>
                  {done ? (
                    <StatusChip tone="mint" icon={<IconCheckCircle className="w-3.5 h-3.5" />}>
                      Đã điểm danh
                    </StatusChip>
                  ) : late ? (
                    <StatusChip tone="coral" icon={<IconAlert className="w-3.5 h-3.5" />}>
                      Quá giờ, chưa điểm danh
                    </StatusChip>
                  ) : (
                    <StatusChip tone="amber" icon={<IconClock className="w-3.5 h-3.5" />}>
                      Chưa điểm danh
                    </StatusChip>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
