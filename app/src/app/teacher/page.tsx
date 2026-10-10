import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  listClassesForTeacher,
  getPackageProgress,
  listAttendance,
  listRescheduleRequests,
  listConfirmedClassIdsOn,
  getLateCheckinQuota,
  nextSessionNumbers,
  sessionNumberMap,
  checkedInSlots,
  plannedClassesOn,
} from "@/lib/queries";
import { addDays, toISODate, todayISO, now } from "@/lib/format";
import { ATTENDANCE_STATUS_LABELS, DAY_LABELS, personKey, teacherSees, scheduleStart } from "@/lib/types";
import { buildBackupMessage } from "@/lib/messenger-backup";
import MessengerBackupList, { type BackupItem } from "./messenger-backup";
import { IconCalendarCheck, IconChat, IconCheckCircle, IconClock, IconMusic } from "@/components/icons";
import { Card, CardHeader, EmptyState, TableShell, Th, btn } from "@/components/ui";
import RescheduleRow from "@/components/reschedule-row";
import TodayClassCard from "./today-class-card";
import MissedCheckinPanel from "./missed-checkin-panel";
import { missedRowsForTeacher } from "./missed-rows";

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
  const classes = [
    ...listClassesForTeacher(teacherId).filter(
      (c) => c.schedule_type === "fixed" && c.day_of_week === dow && c.status === "active" && scheduleStart(c) <= todayStr
    ),
    // Lớp linh động có buổi hẹn hôm nay (giáo viên xếp theo tháng).
    ...plannedClassesOn(todayStr, teacherId),
  ]
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    // Khoá "khách|giờ" lấy từ tên thật, trước khi đổi sang tên giáo viên đặt.
    .map((c) => ({ ...teacherSees(c), existing: attendanceByClassId.get(c.id), slot: `${personKey(c)}|${c.start_time}` }));
  // Already-checked-in classes drop off "Hôm nay" — the teacher has
  // finished that session; corrections go through "Lịch sử điểm danh".
  // Khách bị nhập thành hai lớp trùng giờ: một lớp điểm danh rồi thì lớp kia
  // không hiện ra bắt điểm danh lần nữa (điểm danh cả hai = 1 tiết tính 2).
  const slotsDone = checkedInSlots(todayStr, todayStr);
  const pendingClasses = classes.filter(
    (c) => !c.existing && !slotsDone.has(`${c.slot}|${todayStr}`)
  );
  // Số gợi ý cho ô "Buổi thứ mấy": tự nhảy tiếp từ số giáo viên điền lần trước.
  const nextNumbers = nextSessionNumbers(pendingClasses);
  const doneCount = classes.length - pendingClasses.length;
  const firstName = session!.name.split(" ").pop();
  const pendingReschedules = listRescheduleRequests({ teacherId, status: "pending" }).map(teacherSees);
  const confirmedToday = listConfirmedClassIdsOn(todayStr);
  const missedRows = missedRowsForTeacher(teacherId);

  // Buổi 7 ngày gần đây đã điểm danh trên web nhưng chưa đăng bản sao lên
  // nhóm Messenger — giữ ở đây tới khi giáo viên bấm "Đã gửi".
  const recent = listAttendance({ teacherId, from: toISODate(addDays(today, -7)), to: todayStr })
    .filter((a) => !a.fb_checkin_confirmed)
    .map(teacherSees);
  const recentNumbers = sessionNumberMap([...new Set(recent.map((a) => a.class_id))]);
  const backupItems: BackupItem[] = recent.map((a) => ({
    key: String(a.id),
    classId: a.class_id,
    sessionDate: a.session_date,
    title: `${a.student_name} · ${a.session_date.slice(8, 10)}/${a.session_date.slice(5, 7)}`,
    messengerUrl: a.class_messenger_url ?? null,
    message: buildBackupMessage({
      studentName: a.student_name,
      sessionDate: a.session_date,
      status: a.status,
      statusLabel: ATTENDANCE_STATUS_LABELS[a.status],
      sessionNumber: a.is_trial ? "0" : String(recentNumbers.get(a.id) ?? ""),
      lessonContent: a.lesson_content ?? "",
      note: a.note ?? "",
      rescheduledDate: a.rescheduled_to_date ?? "",
      rescheduledTime: a.rescheduled_to_time ?? "",
    }),
  }));

  return (
    <div className="space-y-5">
      {/* Hero — ca làm việc hôm nay */}
      <section className="rounded-2xl bg-navy-950 text-white px-5 py-6 sm:px-7 sm:py-7">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight">Xin chào, {firstName}</h1>
        <p className="text-navy-200 text-sm mt-1">
          {DAY_LABELS[dow]} {todayStr.slice(8, 10)}/{todayStr.slice(5, 7)}/{todayStr.slice(0, 4)} · Bạn có{" "}
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
              const nextNumber = nextNumbers.get(c.id);
              const progress = getPackageProgress(c);
              return (
                <TodayClassCard
                  key={c.id}
                  cls={c}
                  sessionDate={todayStr}
                  progress={progress}
                  // A class still waiting on its trial prefills "buổi 0", so
                  // the teacher sees the trial rate is what applies today.
                  sessionNumber={nextNumber}
                  overdue={nowMinutes > classEndMinutes(c.start_time, c.duration_minutes)}
                  confirmed={confirmedToday.has(c.id)}
                />
              );
            })}
          </ol>
        </section>
      )}

      {backupItems.length > 0 && (
        <Card padded={false} className="border-[#A033FF]/25">
          <CardHeader
            title="Gửi bản sao điểm danh lên Messenger"
            count={backupItems.length}
            icon={<IconChat className="w-5 h-5 text-[#A033FF]" />}
          />
          <p className="px-4 sm:px-5 pt-3 text-sm text-ink-500">
            Buổi đã điểm danh trên web. Bấm <b>Copy &amp; mở nhóm</b>, dán vào nhóm Messenger của lớp rồi bấm{" "}
            <b>Đã gửi</b>.
          </p>
          {backupItems.some((it) => !it.messengerUrl) && (
            <p className="px-4 sm:px-5 pt-1 text-xs text-ink-400">
              Lớp nào chưa gắn link nhóm Messenger thì nút chỉ chép tin — gắn link ở Lịch dạy → Sửa để lần
              sau bấm là mở đúng nhóm.
            </p>
          )}
          <MessengerBackupList items={backupItems} />
        </Card>
      )}

      <MissedCheckinPanel rows={missedRows} quota={getLateCheckinQuota()} />

      {pendingReschedules.length > 0 && (
        <Card padded={false} className="border-amber-200">
          <CardHeader
            title="Học viên xin dời lịch"
            count={pendingReschedules.length}
            icon={<IconClock className="w-5 h-5" />}
            tone="warning"
          />
          <TableShell>
            <thead>
              <tr>
                <Th>Học viên</Th>
                <Th>Buổi gốc</Th>
                <Th>Xin dời sang</Th>
                <Th>Lý do</Th>
                <Th>Trạng thái</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {pendingReschedules.map((r) => (
                <RescheduleRow key={r.id} request={r} />
              ))}
            </tbody>
          </TableShell>
        </Card>
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
