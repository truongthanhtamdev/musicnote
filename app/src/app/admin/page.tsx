import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { listClassesByDay, listAttendance, countLeadsDue } from "@/lib/queries";
import { formatTimeRange, todayISO } from "@/lib/format";
import { PageHeader } from "@/components/app-shell";
import {
  IconArrowRight,
  IconBook,
  IconCalendar,
  IconChat,
  IconClock,
  IconPhone,
  IconUsers,
} from "@/components/icons";

const WEEKDAYS = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

function classEndMinutes(startTime: string, durationMinutes: number): number {
  const [h, m] = startTime.split(":").map(Number);
  return h * 60 + m + durationMinutes;
}

/** Số một chữ số được đệm thành "01" cho các thẻ đứng cạnh nhau đều mắt. */
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function StatCard({
  label,
  value,
  hint,
  href,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="stat transition hover:border-brand-300">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <span className="stat-value">{value}</span>
      <span className="stat-hint">{hint}</span>
    </Link>
  );
}

export default async function AdminDashboard() {
  const session = await requireRole(["admin", "coordinator"]);

  const teacherStats = db
    .prepare("SELECT COUNT(*) as c FROM users WHERE role='teacher' AND active=1")
    .get() as { c: number };
  const classStats = db
    .prepare("SELECT COUNT(*) as c FROM classes WHERE status='active'")
    .get() as { c: number };
  const unassignedStats = db
    .prepare("SELECT COUNT(*) as c FROM classes WHERE status='active' AND teacher_id IS NULL")
    .get() as { c: number };
  const openLeadStats = db
    .prepare(
      "SELECT COUNT(*) as c FROM leads WHERE status IN ('new','contacted','consulting','trial_scheduled','trial_done')"
    )
    .get() as { c: number };
  const leadsDue = countLeadsDue();

  const today = new Date();
  const dow = today.getDay();
  const todayStr = todayISO();
  const todaysClasses = listClassesByDay(dow);
  const todaysAttendance = listAttendance({ from: todayStr, to: todayStr });
  const markedClassIds = new Set(todaysAttendance.map((a) => a.class_id));
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  return (
    <>
      <PageHeader
        eyebrow={`${WEEKDAYS[dow]}, ${todayStr.split("-").reverse().join("/")}`}
        title={`Chào ngày mới, ${session.name}`}
        sub="Theo dõi công việc và những cơ hội cần chăm sóc hôm nay."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Giáo viên hoạt động"
          value={pad(teacherStats.c)}
          hint="Trong hệ thống"
          href="/admin/teachers"
          icon={<IconUsers />}
        />
        <StatCard
          label="Lớp đang học"
          value={pad(classStats.c)}
          hint="Đang hoạt động"
          href="/admin/classes"
          icon={<IconBook />}
        />
        <StatCard
          label="Lớp cần giao"
          value={pad(unassignedStats.c)}
          hint="Chưa có giáo viên"
          href="/admin/assign"
          icon={<IconCalendar />}
        />
        <StatCard
          label="Khách đang theo"
          value={pad(openLeadStats.c)}
          hint="Tiếp tục chăm sóc"
          href="/admin/leads?status=open"
          icon={<IconChat />}
        />
        <StatCard
          label="Khách cần gọi"
          value={pad(leadsDue)}
          hint="Đã đến hạn liên hệ"
          href="/admin/leads?due=1"
          icon={<IconPhone />}
        />
      </div>

      {leadsDue > 0 && (
        <Link href="/admin/leads?due=1" className="alert mt-4">
          <IconClock className="size-4 shrink-0" />
          <span>
            <b>{leadsDue}</b> khách hàng đang chờ bạn liên hệ lại
          </span>
          <IconArrowRight className="ml-auto size-4 shrink-0" />
        </Link>
      )}

      <div className="panel mt-6">
        <div className="panel-head">
          <div className="flex items-center gap-2.5">
            <h2 className="panel-title">Lớp học hôm nay</h2>
            <span className="chip">{todaysClasses.length}</span>
          </div>
          <Link href="/admin/attendance" className="text-[12.5px] font-medium text-brand-600 hover:underline">
            Xem toàn bộ điểm danh
          </Link>
        </div>

        {todaysClasses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <IconCalendar className="size-7 text-brand-300" />
            <p className="text-[14px] font-semibold text-ink">Hôm nay chưa có lịch học</p>
            <p className="text-[12.5px] text-muted">
              Dành thời gian chăm sóc những học viên tương lai.
            </p>
            <Link href="/admin/leads" className="btn btn-primary mt-3">
              Xem khách tiềm năng
              <IconArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div>
            {todaysClasses.map((c) => {
              const marked = markedClassIds.has(c.id);
              const overdue =
                !marked && nowMinutes > classEndMinutes(c.start_time, c.duration_minutes);
              return (
                <div
                  key={c.id}
                  className={`flex items-center justify-between gap-4 border-b border-line-soft px-[18px] py-3.5 last:border-b-0 ${
                    overdue ? "bg-red-50/60" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink">{c.student_name}</p>
                    <p className="text-[12.5px] text-muted">
                      {formatTimeRange(c.start_time, c.duration_minutes)} ·{" "}
                      {c.teacher_name || "Chưa có GV"}
                    </p>
                  </div>
                  <span
                    className={`badge ${
                      marked
                        ? "bg-brand-50 text-brand-700"
                        : overdue
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {marked
                      ? "Đã điểm danh"
                      : overdue
                        ? "Quá giờ, chưa điểm danh"
                        : "Chưa điểm danh"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
