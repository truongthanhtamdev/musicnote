import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listClassesForTeacher, getPackageProgress, listAttendance } from "@/lib/queries";
import { todayISO, now } from "@/lib/format";
import { DAY_LABELS } from "@/lib/types";
import { IconCalendarCheck, IconCheckCircle, IconMusic } from "@/components/icons";
import { Card, EmptyState, btn } from "@/components/ui";
import FbReminder from "./fb-reminder";
import TodayClassCard from "./today-class-card";

function classEndMinutes(startTime: string, durationMinutes: number): number {
  const [h, m] = startTime.split(":").map(Number);
  return h * 60 + m + durationMinutes;
}

export default async function TeacherTodayPage() {
  const session = await getSession();
  const teacherId = session!.userId;

  const today = now();
  const dow = today.getDay();
  const todayStr = todayISO();
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  const todaysAttendance = listAttendance({ teacherId, from: todayStr, to: todayStr });
  const attendanceByClassId = new Map(todaysAttendance.map((a) => [a.class_id, a]));
  const classes = listClassesForTeacher(teacherId)
    .filter((c) => c.day_of_week === dow && c.status === "active")
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((c) => ({ ...c, existing: attendanceByClassId.get(c.id) }));
  // Already-checked-in classes drop off "Hôm nay" — the teacher has
  // finished that session; corrections go through "Lịch sử điểm danh".
  const pendingClasses = classes.filter((c) => !c.existing);
  const doneCount = classes.length - pendingClasses.length;
  const firstName = session!.name.split(" ").pop();

  return (
    <div className="space-y-5">
      {/* Hero — ca làm việc hôm nay */}
      <section className="rounded-2xl bg-navy-950 text-white px-5 py-6 sm:px-7 sm:py-7">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight">Xin chào, {firstName}</h1>
        <p className="text-navy-200 text-sm mt-1">
          {DAY_LABELS[dow]}, {todayStr} · Bạn có{" "}
          <span className="font-semibold text-white tabular">{classes.length} tiết</span> hôm nay
        </p>

        {classes.length > 0 && (
          <div className="mt-5 max-w-sm">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-navy-200">Tiến độ điểm danh</span>
              <span className="font-semibold tabular">
                {doneCount}/{classes.length} tiết
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-mint-500 transition-all"
                style={{ width: `${classes.length ? (doneCount / classes.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </section>

      <FbReminder today={todayStr} />

      {classes.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<IconMusic className="w-7 h-7" />}
            title="Hôm nay bạn không có lớp nào"
            description="Xem lịch dạy cả tuần để chuẩn bị cho các buổi sắp tới."
            action={
              <Link href="/teacher/schedule" className={btn.secondary}>
                Xem lịch dạy
              </Link>
            }
          />
        </Card>
      ) : pendingClasses.length === 0 ? (
        <Card padded={false} className="border-mint-200">
          <EmptyState
            icon={<IconCheckCircle className="w-7 h-7" />}
            title="Đã điểm danh xong tất cả lớp hôm nay"
            description="Cần sửa lại buổi nào thì vào Lịch sử điểm danh."
            action={
              <Link href="/teacher/attendance" className={btn.secondary}>
                Lịch sử điểm danh
              </Link>
            }
          />
        </Card>
      ) : (
        <section>
          <h2 className="font-semibold text-ink-900 flex items-center gap-2 mb-3">
            <IconCalendarCheck className="w-5 h-5 text-wood-500" />
            Lớp cần điểm danh ({pendingClasses.length})
          </h2>
          <ol className="relative">
            {pendingClasses.map((c) => {
              const progress = getPackageProgress(c);
              return (
                <TodayClassCard
                  key={c.id}
                  cls={c}
                  sessionDate={todayStr}
                  progress={progress}
                  // A class still waiting on its trial prefills "buổi 0", so
                  // the teacher sees the trial rate is what applies today.
                  sessionNumber={c.trial_pending ? 0 : progress ? progress.used + 1 : undefined}
                  overdue={nowMinutes > classEndMinutes(c.start_time, c.duration_minutes)}
                />
              );
            })}
          </ol>
        </section>
      )}

      {doneCount > 0 && pendingClasses.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-600 flex items-center gap-2">
            <IconCheckCircle className="w-4.5 h-4.5 text-mint-500" />
            Đã điểm danh <span className="font-semibold text-ink-900 tabular">{doneCount}</span> lớp
            hôm nay
          </p>
          <Link href="/teacher/attendance" className={btn.secondary}>
            Xem lại / sửa
          </Link>
        </Card>
      )}
    </div>
  );
}
