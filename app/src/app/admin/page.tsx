import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { db } from "@/lib/db";
import {
  listClassesByDay,
  listConfirmedClassIdsOn,
  listMissedCheckins,
  listPausedClassesDue,
  listAttendance,
  listClasses,
  listPackagesNearingCompletion,
} from "@/lib/queries";
import { formatTimeRange, todayISO, toISODate, addDays, now } from "@/lib/format";
import { DAY_LABELS, MANAGE_ROLES, scheduleStart, shortDayLabel } from "@/lib/types";
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

/** Số tiết theo lịch và số tiết đã ghi nhận điểm danh trong 7 ngày gần nhất. */
function weeklyStats() {
  const activeClasses = listClasses({ status: "active" });
  const days: { label: string; date: string; scheduled: number; taught: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(now(), -i);
    const date = toISODate(d);
    const scheduled = activeClasses.filter(
      (c) =>
        c.schedule_type === "fixed" &&
        c.day_of_week === d.getDay() &&
        scheduleStart(c) <= date
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
  // Trang lớp học: nhân viên đặt hẹn không vào, chỉ Quản lý trở lên.
  await requireRole(MANAGE_ROLES);
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

  const today = now();
  const dow = today.getDay();
  const todayStr = todayISO();
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  const todaysClasses = listClassesByDay(dow, todayStr);
  const confirmedToday = listConfirmedClassIdsOn(todayStr);
  // Buổi đã qua mà giáo viên chưa điểm danh — nợ cả điểm danh lẫn nội dung bài
  // cho khách, nên tô đậm cho giáo vụ nhắc.
  const missed = listMissedCheckins();
  const pausedDue = listPausedClassesDue();
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
        subtitle={`Hôm nay là ${DAY_LABELS[dow]}, ${todayStr.split("-").reverse().join("/")}`}
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
          hint={overdue.length ? `${overdue.length} tiết đã học xong — điểm danh trong ngày` : "Chưa tới giờ dạy"}
          icon={<IconClock className="w-5 h-5" />}
          tone="amber"
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
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

      <div className="grid grid-cols-1 [&>*]:min-w-0 lg:grid-cols-3 gap-4">
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
              title="Chưa có tiết nào cần điểm danh"
              description="Tiết nào học xong mà chưa điểm danh sẽ hiện ở đây — giáo viên điểm danh trong ngày là được."
            />
          ) : (
            <>
              <p className="px-5 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Đã học xong, chưa điểm danh
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
                    <StatusChip tone="amber">Hạn hết hôm nay</StatusChip>
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

      {pausedDue.length > 0 && (
        <Card padded={false} className="border-2 border-amber-300">
          <CardHeader
            title="Lớp Tạm OFF sắp tới ngày học lại"
            count={pausedDue.length}
            icon={<IconClock className="w-4.5 h-4.5" />}
            tone="warning"
          />
          <ul className="divide-y divide-amber-100">
            {pausedDue.map((c) => (
              <li
                key={c.id}
                className="px-4 sm:px-5 py-3 bg-amber-50/60 flex flex-wrap items-center gap-x-3 gap-y-1.5"
              >
                <Avatar name={c.student_name} className="w-8 h-8 text-[11px]" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/classes/${c.id}`}
                    className="text-sm font-semibold text-ink-900 hover:text-wood-700 truncate block"
                  >
                    {c.student_name}
                  </Link>
                  <p className="text-xs text-ink-500 flex items-center gap-1">
                    <SubjectIcon subject={c.subject} className="w-3.5 h-3.5" />
                    {c.subject} · {c.teacher_name || "Chưa có GV"}
                  </p>
                </div>
                <span className="text-sm text-ink-600 tabular whitespace-nowrap">
                  Học lại {c.paused_until}
                </span>
                <StatusChip tone={c.daysUntilReturn < 0 ? "coral" : "amber"}>
                  {c.daysUntilReturn < 0
                    ? `Quá hạn ${-c.daysUntilReturn} ngày`
                    : c.daysUntilReturn === 0
                      ? "Hôm nay"
                      : `Còn ${c.daysUntilReturn} ngày`}
                </StatusChip>
              </li>
            ))}
          </ul>
          <p className="px-5 py-3 border-t border-amber-100 bg-white text-sm text-ink-600">
            Gọi khách chốt lịch học lại, rồi đổi trạng thái lớp về &ldquo;Đang học&rdquo;.
          </p>
        </Card>
      )}

      {missed.length > 0 && (
        <Card padded={false} className="border-2 border-coral-300">
          <CardHeader
            title="Buổi đã qua chưa điểm danh"
            count={missed.length}
            icon={<IconAlert className="w-4.5 h-4.5" />}
            tone="warning"
            action={<DetailLink href="/admin/payroll">Xem ảnh hưởng tới lương</DetailLink>}
          />
          <ul className="divide-y divide-coral-100">
            {missed.slice(0, 6).map((m) => (
              <li
                key={`${m.cls.id}-${m.date}`}
                className="px-4 sm:px-5 py-3 bg-coral-50/60 flex items-center gap-3"
              >
                <span className="hidden sm:block text-sm font-bold text-coral-800 tabular w-20 shrink-0">
                  {shortDayLabel(m.date)}
                </span>
                <span className="hidden sm:block shrink-0">
                  <Avatar name={m.cls.student_name} className="w-8 h-8 text-[11px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-coral-800 truncate">
                    {m.cls.student_name}
                  </p>
                  <p className="text-xs text-ink-600 flex flex-wrap items-center gap-x-1">
                    <SubjectIcon subject={m.cls.subject} className="w-3.5 h-3.5" />
                    <span className="sm:hidden font-semibold tabular">{shortDayLabel(m.date)} ·</span>
                    <span className="tabular">{formatTimeRange(m.cls.start_time, m.cls.duration_minutes)}</span>·
                    <span>{m.cls.teacher_name || "Chưa có GV"}</span>
                  </p>
                </div>
                <span className="shrink-0">
                  <StatusChip tone="coral" icon={<IconAlert className="w-3.5 h-3.5" />}>
                    Trễ {m.daysLate} ngày
                  </StatusChip>
                </span>
              </li>
            ))}
          </ul>
          {missed.length > 6 && (
            <Link
              href="/admin/attendance"
              className="block px-5 py-2.5 text-sm font-semibold text-coral-700 border-t border-coral-100 hover:bg-coral-50"
            >
              và {missed.length - 6} buổi khác →
            </Link>
          )}
          <p className="px-5 py-3 border-t border-coral-100 bg-white text-sm text-ink-600">
            Giáo viên thấy đúng danh sách này ở trang của mình kèm nút &ldquo;Điểm danh
            bù&rdquo;. Số lần điểm danh bù vượt hạn mức sẽ tự bị trừ trong bảng lương.
          </p>
        </Card>
      )}

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
                  className={`px-4 sm:px-5 py-3 flex items-center gap-3 ${late ? "bg-amber-50/50" : ""}`}
                >
                  <span className="hidden sm:block text-sm font-semibold text-ink-900 tabular w-24 shrink-0">
                    {formatTimeRange(c.start_time, c.duration_minutes)}
                  </span>
                  <span className="hidden sm:block shrink-0">
                    <Avatar name={c.student_name} className="w-8 h-8 text-[11px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 truncate">{c.student_name}</p>
                    <p className="text-xs text-ink-500 flex flex-wrap items-center gap-x-1">
                      <SubjectIcon subject={c.subject} className="w-3.5 h-3.5" />
                      <span className="sm:hidden font-semibold text-ink-700 tabular">
                        {formatTimeRange(c.start_time, c.duration_minutes)} ·
                      </span>
                      {c.subject} · {c.teacher_name || "Chưa có GV"}
                    </p>
                    {!done && confirmedToday.has(c.id) && (
                      <p className="text-xs text-mint-700 font-semibold mt-0.5">✓ HV đã xác nhận tham gia</p>
                    )}
                  </div>
                  <span className="shrink-0">
                  {done ? (
                    <StatusChip tone="mint" icon={<IconCheckCircle className="w-3.5 h-3.5" />}>
                      Đã điểm danh
                    </StatusChip>
                  ) : late ? (
                    <StatusChip tone="amber" icon={<IconAlert className="w-3.5 h-3.5" />}>
                      Chưa điểm danh
                    </StatusChip>
                  ) : (
                    <StatusChip tone="neutral" icon={<IconClock className="w-3.5 h-3.5" />}>
                      Chưa điểm danh
                    </StatusChip>
                  )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
