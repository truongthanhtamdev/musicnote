import Link from "next/link";
import { getSession, getUserById } from "@/lib/auth";
import {
  listClassesForStudent,
  getPackageProgress,
  listAttendance,
  listTeacherFreeSlots,
  listUpcomingSessionsForStudent,
  type FreeSlotOption,
  getCenterContact,
  getTuitionStatusForClasses,
  sessionNumberMap,
} from "@/lib/queries";
import { wheelBonusForPhone } from "@/lib/wheel-state";
import { toISODate, nextOccurrence, formatTimeRange, formatVND, now, todayISO } from "@/lib/format";
import {
  ATTENDANCE_STATUS_LABELS,
  CANCEL_NOTICE_HOURS,
  DAY_LABELS,
  MAKEUP_WINDOW_DAYS,
  REMINDER_DAYS,
  formatClassSchedule,
  isNoticeInTime,
  personKey,
  scheduleStart,
} from "@/lib/types";
import { IconClock, IconGuitar, IconMusic, IconPiano, IconUser, SubjectIcon } from "@/components/icons";
import {
  Banner,
  Card,
  CardHeader,
  EmptyState,
  ProgressBar,
  StatusChip,
  btn,
  packageTone,
} from "@/components/ui";
import { ContactButtons } from "@/components/contact-buttons";
import { FacebookSteps } from "@/components/facebook-steps";
import { JoinClassLink } from "@/components/join-class-link";
import ExtraTrialForm from "./extra-trial-form";
import SessionActions from "./session-actions";

/** "T2 28/09" — ngày kèm thứ, dễ đọc hơn 2026-09-28. */
function dayLabel(iso: string): string {
  return `${DAY_LABELS[new Date(`${iso}T00:00:00`).getDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

function countdownLabel(daysAway: number): string {
  if (daysAway <= 0) return "Hôm nay";
  if (daysAway === 1) return "Ngày mai";
  return `Còn ${daysAway} ngày`;
}

export default async function StudentHomePage() {
  const session = await getSession();
  const me = getUserById(session!.userId);
  const missingProfile = !me?.phone || !me?.facebook_url;
  const contact = getCenterContact();
  const classes = listClassesForStudent(session!.userId);
  const upcoming = listUpcomingSessionsForStudent(session!.userId);
  const rightNow = now();
  const todayStr = todayISO();

  // Một khoá học = một gói (hoặc cùng môn nếu không theo gói). Học 2 buổi/tuần
  // là 2 dòng lớp nhưng chỉ hiện một ô, lịch sử bài học cũng liền một mạch.
  const courseMap = new Map<string, typeof classes>();
  for (const c of classes) {
    const key = c.package_id ? `p${c.package_id}` : `s${c.subject}|${personKey(c)}`;
    courseMap.set(key, [...(courseMap.get(key) ?? []), c]);
  }
  const courses = [...courseMap.values()];
  const tuition = getTuitionStatusForClasses(classes);
  // Ưu đãi vòng quay: chỉ nhắc khi khách chưa đăng ký khoá (chưa có gói nào).
  const wheelBonus = classes.some((c) => c.package_id)
    ? null
    : wheelBonusForPhone(me?.phone ?? classes[0]?.student_phone ?? null);

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

      {/* Nhắc một dòng khi hồ sơ còn thiếu — trung tâm cần số điện thoại để
          báo khi giáo viên đổi lịch, mà lớp nhập từ Excel hay trống ô này. */}
      {missingProfile && (
        <Banner
          tone="amber"
          icon={<IconUser className="w-5 h-5" />}
          title="Bổ sung thông tin liên hệ giúp trung tâm nhé"
          action={
            <Link href="/student/ho-so" className={btn.secondary}>
              Điền ngay
            </Link>
          }
        >
          Trung tâm cần số điện thoại và Facebook/Zalo để báo bạn khi lịch học có thay đổi. Mất
          khoảng 30 giây.
        </Banner>
      )}

      {wheelBonus ? (
        <Banner tone="mint" title={`🎁 Bạn có ưu đãi +${wheelBonus} buổi tặng khi đăng ký khóa học`}>
          Phần thưởng từ vòng quay may mắn — trung tâm cộng thêm vào gói khi bạn đăng ký khóa.
        </Banner>
      ) : null}

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
                      {/* Buổi sắp tới trong hôm nay hoặc ngày mai mới cho vào
                          phòng — hiện nút cho buổi hai tuần nữa chỉ gây bấm nhầm. */}
                      {item.daysAway <= 1 && !item.recorded && (
                        <JoinClassLink url={item.cls.meeting_url} size="sm" />
                      )}
                      {!item.recorded && !item.cls.meeting_url && (
                        <span className="text-xs text-ink-500">Link Google Meet sẽ hiện ở đây trước giờ học</span>
                      )}
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
          {/* Khách đăng ký học thử là có tài khoản ngay, nên phần lớn người
              thấy màn hình này là người vừa đăng ký chứ không phải lỗi. */}
          <EmptyState
            icon={<IconMusic className="w-7 h-7" />}
            title="Chưa có lớp nào trong tài khoản"
            description="Trung tâm sẽ liên hệ để xếp buổi học thử; xếp lớp xong là lịch học, tiến độ gói và nội dung từng buổi hiện ở đây. Bạn đã học rồi mà chưa thấy lớp thì nhắn Zalo cho trung tâm nhé."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((group) => {
            const c = group[0];
            const progress = getPackageProgress(c);
            const fee = tuition.get(c.id);
            const ids = group.map((g) => g.id);
            const numbers = sessionNumberMap(ids);
            // Lịch sử gộp mọi lịch trong tuần của khoá này, mới nhất trước.
            const history = ids
              .flatMap((id) => listAttendance({ classId: id }))
              .filter((a) => a.lesson_content || a.status !== "completed")
              .sort((a, b) => b.session_date.localeCompare(a.session_date) || b.id - a.id)
              .slice(0, 8);
            const nextDates = group
              .filter((g) => g.schedule_type === "fixed")
              .map((g) => {
                const start = scheduleStart(g);
                const from = start > todayStr ? new Date(`${start}T00:00:00`) : now();
                return toISODate(nextOccurrence(g.day_of_week, from));
              })
              .sort();
            const teachers = [...new Set(group.map((g) => g.teacher_name || "Chưa xếp"))].join(", ");
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
                      {group.map((g) => formatClassSchedule(g)).join(" · ")}
                    </p>
                    <p className="text-sm text-ink-500 tabular">Giáo viên: {teachers}</p>
                  </div>
                  {nextDates.length ? (
                    <StatusChip tone="navy">Buổi tới: {dayLabel(nextDates[0])}</StatusChip>
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
                        {progress.bonus > 0 ? <span className="text-ink-400"> (gồm {progress.bonus} buổi tặng)</span> : null}
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

                {/* Học phí: phụ huynh hỏi nhiều nhất — đã đóng bao nhiêu, còn thiếu không. */}
                {fee && (fee.paid > 0 || fee.expected) ? (
                  <div className="px-5 py-3 border-b border-navy-100 text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-ink-500">Học phí:</span>
                    <span className="font-semibold text-ink-900 tabular">Đã đóng {formatVND(fee.paid)}</span>
                    {fee.expected ? (
                      fee.outstanding > 0 ? (
                        <StatusChip tone="amber">Còn {formatVND(fee.outstanding)}</StatusChip>
                      ) : (
                        <StatusChip tone="mint">Đã đóng đủ</StatusChip>
                      )
                    ) : null}
                  </div>
                ) : null}

                <div className="p-5">
                  <h3 className="text-sm font-semibold text-ink-700 mb-3">
                    Nội dung các buổi học gần đây
                  </h3>
                  {history.length === 0 ? (
                    <p className="text-sm text-ink-400">Chưa có nội dung nào được ghi lại.</p>
                  ) : (
                    <ul className="space-y-3">
                      {history.map((a) => {
                        const n = a.is_trial ? "Buổi học thử" : numbers.get(a.id) ? `Buổi ${numbers.get(a.id)}` : null;
                        return (
                          <li key={a.id} className="text-sm border-l-2 border-wood-200 pl-3.5">
                            <p className="text-ink-400 text-xs tabular">
                              {n ? <span className="font-semibold text-wood-700">{n} · </span> : null}
                              {dayLabel(a.session_date)} · {ATTENDANCE_STATUS_LABELS[a.status]}
                            </p>
                            {a.lesson_content && <p className="text-ink-700 mt-0.5">{a.lesson_content}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tự học giữa hai buổi: chỗ này học viên hay vào nhất nên đặt lối tắt
          ngay đây thay vì bắt nhớ địa chỉ trang. */}
      <Card>
        <p className="font-semibold text-ink-900">Luyện thêm giữa hai buổi học</p>
        <p className="text-sm text-ink-500 mt-0.5">
          Thư viện miễn phí của trung tâm — mở được cả trên điện thoại.
        </p>
        <div className="flex flex-wrap gap-2.5 mt-3">
          <Link href="/guitar" className={`${btn.secondary} py-2.5`}>
            <IconGuitar className="w-4 h-4" />
            Hợp âm &amp; vòng hòa thanh guitar
          </Link>
          <Link href="/piano" className={`${btn.secondary} py-2.5`}>
            <IconPiano className="w-4 h-4" />
            Nhớ nốt &amp; game đọc nốt piano
          </Link>
        </div>
      </Card>

      <Card>
        <ExtraTrialForm studyingSubjects={classes.map((c) => c.subject)} />
      </Card>

      {contact.facebook && (
        <Card>
          <p className="font-semibold text-ink-900">Kết bạn Facebook với em Tâm</p>
          <p className="text-sm text-ink-600 mt-1 mb-3">
            Để được sắp lớp và thêm vào nhóm lớp học trên Facebook. Bấm là mở app Facebook trên điện thoại.
          </p>
          <FacebookSteps facebookUrl={contact.facebook} />
        </Card>
      )}

      <Card>
        <ContactButtons />
      </Card>
    </div>
  );
}
