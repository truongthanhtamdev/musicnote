import { getSession } from "@/lib/auth";
import { listClassesForStudent, getPackageProgress, listAttendance } from "@/lib/queries";
import { toISODate, nextOccurrence } from "@/lib/format";
import { ATTENDANCE_STATUS_LABELS, formatClassSchedule } from "@/lib/types";
import { IconMusic, SubjectIcon } from "@/components/icons";
import { Card, EmptyState, ProgressBar, StatusChip, packageTone } from "@/components/ui";

export default async function StudentHomePage() {
  const session = await getSession();
  const classes = listClassesForStudent(session!.userId);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-navy-950 text-white px-5 py-6 sm:px-7">
        <h1 className="text-2xl font-bold tracking-tight">Chào {session!.name}</h1>
        <p className="text-navy-200 text-sm mt-1">
          Lịch học, tiến độ gói và nội dung bài học của bạn.
        </p>
      </section>

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
    </div>
  );
}
