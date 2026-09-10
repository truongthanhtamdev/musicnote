import { getSession } from "@/lib/auth";
import {
  listClassesForStudent,
  getPackageProgress,
  listAttendance,
  listTeacherFreeSlots,
  listUpcomingSessionsForStudent,
  type FreeSlotOption,
} from "@/lib/queries";
import { toISODate, nextOccurrence, formatTimeRange, now } from "@/lib/format";
import {
  ATTENDANCE_STATUS_LABELS,
  CANCEL_NOTICE_HOURS,
  DAY_LABELS,
  MAKEUP_WINDOW_DAYS,
  REMINDER_DAYS,
  formatClassSchedule,
  isNoticeInTime,
} from "@/lib/types";
import { IconClock, IconMusic, SubjectIcon } from "@/components/icons";
import { Card, CardHeader, EmptyState, ProgressBar, StatusChip, packageTone } from "@/components/ui";
import { ContactButtons } from "@/components/contact-buttons";
import SessionActions from "./session-actions";

function countdownLabel(daysAway: number): string {
  if (daysAway <= 0) return "Hôm nay";
  if (daysAway === 1) return "Ngày mai";
  return `Còn ${daysAway} ngày`;
}

export default async function StudentHomePage() {
  const session = await getSession();
  const classes = listClassesForStudent(session!.userId);
  const upcoming = listUpcomingSessionsForStudent(session!.userId);
  const rightNow = now();

  // Khung trống của mỗi giáo viên chỉ cần lấy một lần cho cả trang, dù học viên
  // có nhiều buổi sắp tới cùng một giáo viên.
  const freeSlotsByClass = new Map<number, FreeSlotOption[]>();
  for (const item of upcoming) {
    if (item.isMakeup || item.recorded || item.pendingRequest || !item.cls.teacher_id) continue;
    if (freeSlotsByClass.has(item.cls.id)) continue;
    freeSlotsByClass.set(
      item.cls.id,
      listTeacherFreeSlots({
        teacherId: item.cls.teacher_id,
        durationMinutes: item.cls.duration_minutes,
        days: MAKEUP_WINDOW_DAYS,
      })
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-navy-950 text-white px-5 py-6 sm:px-7">
        <h1 className="text-2xl font-bold tracking-tight">Chào {session!.name}</h1>
        <p className="text-navy-200 text-sm mt-1">
          Lịch học, tiến độ gói và nội dung bài học của bạn.
        </p>
      </section>

      {classes.length > 0 && (
        <Card padded={false}>
          <CardHeader
            title={`Buổi học sắp tới (${REMINDER_DAYS} ngày)`}
            count={upcoming.length || undefined}
            icon={<IconClock className="w-5 h-5" />}
          />
          {upcoming.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-400">
              Không có buổi nào trong {REMINDER_DAYS} ngày tới.
            </p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {upcoming.map((item) => {
                const [, month, day] = item.date.split("-");
                const dow = DAY_LABELS[new Date(`${item.date}T00:00:00`).getDay()];
                const label = `${item.cls.subject} · ${dow} ${day}/${month} · ${formatTimeRange(
                  item.time,
                  item.cls.duration_minutes
                )}`;
                return (
                  <li
                    key={`${item.cls.id}-${item.date}-${item.isMakeup ? "b" : "t"}`}
                    className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900 flex items-center gap-2">
                        <SubjectIcon subject={item.cls.subject} className="w-5 h-5 text-wood-500" />
                        <span className="truncate">{label}</span>
                      </p>
                      <p className="text-sm text-ink-500 mt-1">
                        Giáo viên: {item.cls.teacher_name || "Chưa xếp"}
                        {item.isMakeup ? " · Buổi học bù đã chốt" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 ml-auto">
                      <StatusChip tone={item.daysAway <= 1 ? "coral" : "navy"}>
                        {countdownLabel(item.daysAway)}
                      </StatusChip>
                      {item.recorded ? (
                        <StatusChip tone={item.recorded.countsAsUsed ? "amber" : "neutral"}>
                          {item.recorded.status === "rescheduled"
                            ? "Đã dời lịch"
                            : item.recorded.status === "teacher_absent"
                              ? "Giáo viên báo bận"
                              : item.recorded.countsAsUsed
                                ? "Đã xin nghỉ · có trừ tiết"
                                : "Đã xin nghỉ · không trừ tiết"}
                        </StatusChip>
                      ) : item.cls.teacher_id ? (
                        <SessionActions
                          classId={item.cls.id}
                          sessionDate={item.date}
                          sessionLabel={label}
                          confirmed={item.confirmed}
                          canReschedule={!item.isMakeup}
                          freeSlots={freeSlotsByClass.get(item.cls.id) ?? []}
                          pendingRequest={item.pendingRequest}
                          noticeInTime={isNoticeInTime(item.date, item.time, rightNow)}
                        />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="px-5 py-4 border-t border-navy-100 bg-ivory-100 text-sm text-ink-600 leading-relaxed">
            Bạn bấm <span className="font-semibold text-ink-800">Xác nhận tham gia</span> để giáo
            viên chuẩn bị bài trước cho buổi học nhé. Nếu bận, bạn có thể{" "}
            <span className="font-semibold text-ink-800">xin dời</span> sang giờ khác hoặc{" "}
            <span className="font-semibold text-ink-800">xin nghỉ</span> buổi đó — báo trước{" "}
            {CANCEL_NOTICE_HOURS} tiếng thì buổi học không bị trừ vào gói. Cảm ơn bạn đã báo sớm để
            trung tâm sắp xếp lịch chu đáo hơn.
          </div>
        </Card>
      )}

      {classes.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<IconMusic className="w-7 h-7" />}
            title="Chưa có lớp học nào gắn với tài khoản của bạn"
            description="Liên hệ trung tâm để được hỗ trợ kết nối lớp học vào tài khoản này."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {classes.map((c) => {
            const progress = getPackageProgress(c);
            const history = listAttendance({ classId: c.id })
              .filter((a) => a.lesson_content)
              .slice(0, 8);
            const nextDate =
              c.schedule_type === "fixed" ? toISODate(nextOccurrence(c.day_of_week)) : null;
            return (
              <Card key={c.id} padded={false}>
                <div className="p-5 flex flex-wrap items-start justify-between gap-3 border-b border-navy-100">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900 flex items-center gap-2">
                      <SubjectIcon subject={c.subject} className="w-5 h-5 text-wood-500" />
                      {c.subject}
                      {c.level ? ` · ${c.level}` : ""}
                    </p>
                    <p className="text-sm text-ink-500 mt-1 tabular">
                      {formatClassSchedule(c)} · Giáo viên: {c.teacher_name || "Chưa xếp"}
                    </p>
                  </div>
                  {nextDate ? (
                    <StatusChip tone="navy">Buổi tới: {nextDate}</StatusChip>
                  ) : (
                    <StatusChip tone="neutral">Lịch linh động</StatusChip>
                  )}
                </div>

                {progress && (
                  <div className="px-5 py-4 border-b border-navy-100">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-sm text-ink-600 tabular">
                        Đã học <span className="font-semibold text-ink-900">{progress.used}</span> /{" "}
                        {progress.total} tiết
                      </span>
                      <span
                        className={`text-sm font-semibold tabular ${
                          progress.remaining <= 3
                            ? "text-coral-600"
                            : progress.remaining <= 5
                              ? "text-amber-700"
                              : "text-ink-500"
                        }`}
                      >
                        Còn {progress.remaining} tiết
                      </span>
                    </div>
                    <ProgressBar
                      value={progress.used}
                      max={progress.total}
                      tone={packageTone(progress.remaining)}
                    />
                    {progress.remaining <= 3 && (
                      <p className="text-xs text-coral-600 mt-2">
                        Gói học sắp hết — liên hệ trung tâm để gia hạn.
                      </p>
                    )}
                  </div>
                )}

                <div className="p-5">
                  <h3 className="text-sm font-semibold text-ink-700 mb-3">
                    Nội dung các buổi học gần đây
                  </h3>
                  {history.length === 0 ? (
                    <p className="text-sm text-ink-400">Chưa có nội dung nào được ghi lại.</p>
                  ) : (
                    <ul className="space-y-3">
                      {history.map((a) => (
                        <li key={a.id} className="text-sm border-l-2 border-wood-200 pl-3.5">
                          <p className="text-ink-400 text-xs tabular">
                            {a.session_date} · {ATTENDANCE_STATUS_LABELS[a.status]}
                          </p>
                          <p className="text-ink-700 mt-0.5">{a.lesson_content}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <ContactButtons />
      </Card>
    </div>
  );
}
