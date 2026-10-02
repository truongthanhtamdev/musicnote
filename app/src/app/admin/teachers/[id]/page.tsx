import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getTeacher,
  listBusySlots,
  listClassesForTeacher,
  listAttendance,
  computePayroll,
  sessionNumberMap,
  type AttendanceWithContext,
} from "@/lib/queries";
import { formatVND, monthRangeOf, todayISO } from "@/lib/format";
import { MonthNav } from "@/components/month-nav";
import { MonthSelect } from "@/components/month-select";
import { db } from "@/lib/db";
import { LANGUAGE_LABELS, parseLanguages, parseSubjects, MANAGE_ROLES, TRIAL_SESSION_RATE, personKey } from "@/lib/types";
import { TeacherScheduleGrid } from "@/components/teacher-schedule-grid";
import TeacherClassList from "./class-list";
import { AttendanceStatusCell } from "@/components/attendance-status-cell";
import { IconCalendarCheck, IconChevronLeft, IconClasses, IconClock, IconWallet } from "@/components/icons";
import {
  Avatar,
  Card,
  CardHeader,
  EmptyState,
  MetricCard,
  StatusChip,
  TableShell,
  Th,
} from "@/components/ui";
import EditTeacherForm from "./edit-teacher-form";
import ToggleActiveButton from "./toggle-active-button";
import ResetPasswordButton from "@/components/reset-password-button";

/** Điểm danh của một học viên trong kỳ — gom để xem giáo viên dạy từng khách ra sao. */
interface StudentGroup {
  key: string;
  /** Các lớp (lịch trong tuần) của cùng một khách — khách học 2 buổi/tuần là 2 lớp. */
  classIds: number[];
  name: string;
  rows: AttendanceWithContext[];
  taught: number;
  trial: number;
  missed: number;
  late: number;
}

function groupByStudent(rows: AttendanceWithContext[]): StudentGroup[] {
  // Gom theo người khách chứ không theo lớp: một khách học nhiều lịch trong
  // tuần là nhiều dòng lớp, nhưng chỉ nên hiện một mục.
  const map = new Map<string, StudentGroup>();
  for (const a of rows) {
    const key = personKey(a);
    let g = map.get(key);
    if (!g) {
      g = { key, classIds: [], name: a.student_name, rows: [], taught: 0, trial: 0, missed: 0, late: 0 };
      map.set(key, g);
    }
    if (!g.classIds.includes(a.class_id)) g.classIds.push(a.class_id);
    g.rows.push(a);
    if (a.status === "completed") {
      if (a.is_trial) g.trial++;
      else g.taught++;
      if (a.late_checkin) g.late++;
    } else {
      g.missed++;
    }
  }
  return [...map.values()].sort((a, b) => b.taught + b.trial - (a.taught + a.trial) || a.name.localeCompare(b.name));
}

export default async function TeacherDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  // Trang lớp học: nhân viên đặt hẹn không vào, chỉ Quản lý trở lên.
  await requireRole(MANAGE_ROLES);
  const { id } = await params;
  const teacherId = Number(id);
  const teacher = getTeacher(teacherId);
  if (!teacher) notFound();

  const session = await getSession();
  // Quản lý được tạo tài khoản giáo viên và xem mức lương/buổi — chỉ sổ
  // doanh thu là của riêng chủ trung tâm.
  const isAdmin = session?.role === "admin" || session?.role === "manager";

  const busySlots = listBusySlots(teacherId);
  const classes = listClassesForTeacher(teacherId);
  // Kỳ xem công: mặc định tháng này, đổi bằng nút tháng trước / tháng này.
  const sp = await searchParams;
  const month = monthRangeOf(todayISO());
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from! : month.from;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to! : month.to;
  const pay = computePayroll(from, to).find((r) => r.teacher_id === teacherId);
  // Các tháng để chọn: từ buổi điểm danh đầu tiên của giáo viên tới tháng này.
  const first = (
    db.prepare("SELECT MIN(session_date) AS d FROM attendance WHERE teacher_id = ?").get(teacherId) as {
      d: string | null;
    }
  ).d;
  const months: string[] = [];
  for (let m = month.from.slice(0, 7); months.length < 36; ) {
    months.push(m);
    if (!first || m <= first.slice(0, 7)) break;
    m = monthRangeOf(`${m}-01`, -1).from.slice(0, 7);
  }
  const periodRows = listAttendance({ teacherId, from, to });
  const byStudent = groupByStudent(periodRows);
  const sessionNumbers = sessionNumberMap([...new Set(periodRows.map((a) => a.class_id))]);
  const periodLabel =
    from.slice(0, 7) === to.slice(0, 7) && from.endsWith("-01")
      ? `tháng ${Number(from.slice(5, 7))}/${from.slice(0, 4)}`
      : `${from.slice(8, 10)}/${from.slice(5, 7)} → ${to.slice(8, 10)}/${to.slice(5, 7)}/${to.slice(0, 4)}`;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/teachers"
        className="inline-flex items-center gap-1 py-2 -my-2 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <IconChevronLeft className="w-4 h-4" />
        Danh sách giáo viên
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <Avatar name={teacher.name} className="w-12 h-12 text-sm" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">{teacher.name}</h1>
            <p className="text-ink-500 text-sm">{teacher.email}</p>
            <p className="text-ink-500 text-sm mt-0.5">
              {parseSubjects(teacher.subjects).join(", ") || "Chưa khai báo chuyên môn"} ·{" "}
              {parseLanguages(teacher.languages)
                .map((l) => LANGUAGE_LABELS[l])
                .join(", ")}
            </p>
          </div>
        </div>
        {isAdmin && <ToggleActiveButton teacherId={teacher.id} active={!!teacher.active} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 [&>*]:min-w-0">
        <Card padded={false}>
          <CardHeader title="Thông tin giáo viên" />
          <div className="p-5">
            {isAdmin ? (
              <>
                <EditTeacherForm teacher={teacher} />
                <div className="mt-4 pt-4 border-t border-navy-100 flex justify-end">
                  <ResetPasswordButton userId={teacher.id} />
                </div>
              </>
            ) : (
              <dl className="text-sm space-y-2.5">
                <div className="flex gap-3">
                  <dt className="text-ink-500 w-28 shrink-0">SĐT</dt>
                  <dd className="text-ink-900 tabular">{teacher.phone || "–"}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="text-ink-500 w-28 shrink-0">Chuyên môn</dt>
                  <dd className="text-ink-900">
                    {parseSubjects(teacher.subjects).join(", ") || "Chưa khai báo"}
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="text-ink-500 w-28 shrink-0">Ngôn ngữ dạy</dt>
                  <dd className="text-ink-900">
                    {parseLanguages(teacher.languages)
                      .map((l) => LANGUAGE_LABELS[l])
                      .join(", ")}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </Card>

        <Card padded={false}>
          <CardHeader
            title="Lớp đang phụ trách"
            count={classes.length}
            icon={<IconClasses className="w-4.5 h-4.5 text-wood-500" />}
          />
          <TeacherClassList classes={classes} />
        </Card>
      </div>

      <Card padded={false}>
        <CardHeader
          title="Lịch tuần của giáo viên"
          icon={<IconClock className="w-4.5 h-4.5 text-navy-600" />}
          action={<span className="text-xs text-ink-400">Bấm ô trống để thêm lớp</span>}
        />
        <div className="p-5">
          <TeacherScheduleGrid
            teacherId={teacher.id}
            classes={classes}
            busySlots={busySlots}
            mode="admin"
          />
        </div>
      </Card>

      {/* Công của giáo viên trong kỳ — cùng cách tính với trang Chấm công / Lương. */}
      <Card padded={false}>
        <CardHeader
          title={`Công ${periodLabel}`}
          icon={<IconWallet className="w-4.5 h-4.5 text-wood-500" />}
        />
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <MonthSelect months={months} from={from} to={to} />
            <form className="flex flex-wrap items-end gap-2">
              <input
                type="date"
                name="from"
                defaultValue={from}
                aria-label="Từ ngày"
                className="rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm tabular"
              />
              <span className="text-ink-400 py-2">→</span>
              <input
                type="date"
                name="to"
                defaultValue={to}
                aria-label="Đến ngày"
                className="rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm tabular"
              />
              <button
                type="submit"
                className="rounded-xl bg-wood-500 hover:bg-wood-600 text-white px-4 py-2 text-sm font-semibold"
              >
                Xem
              </button>
            </form>
          </div>
          <MonthNav from={from} />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <MetricCard label="Tiết đã dạy" value={pay?.completed_sessions ?? 0} unit="tiết" tone="mint" />
            <MetricCard
              label="Buổi học thử"
              value={pay?.trial_sessions ?? 0}
              unit="buổi"
              hint={`${formatVND(TRIAL_SESSION_RATE)}/buổi`}
              tone="wood"
            />
            <MetricCard
              label="Điểm danh bù"
              value={pay?.late_sessions ?? 0}
              unit="buổi"
              hint={pay?.unpaid_late_sessions ? `Trừ ${pay.unpaid_late_sessions} buổi quá mức tha` : "Chưa bị trừ"}
              tone={pay?.unpaid_late_sessions ? "coral" : "navy"}
            />
            <MetricCard
              label="Thưởng / phụ cấp"
              value={formatVND(pay?.adjustment_total ?? 0)}
              tone="navy"
            />
            <MetricCard
              label="Tổng công"
              value={formatVND(pay?.total_pay ?? 0)}
              hint={pay?.pay_per_session ? `${formatVND(pay.pay_per_session)}/tiết` : "Chưa khai đơn giá"}
              tone="amber"
            />
          </div>
          <Link
            href={`/admin/payroll?from=${from}&to=${to}`}
            className="inline-block text-sm font-semibold text-wood-600 hover:text-wood-700"
          >
            Xem bảng lương cả trung tâm →
          </Link>
        </div>
      </Card>

      {/* Điểm danh gom theo học viên: bấm tên để xem từng buổi. */}
      <Card padded={false}>
        <CardHeader
          title={`Điểm danh theo học viên · ${periodLabel}`}
          count={byStudent.length}
          icon={<IconCalendarCheck className="w-4.5 h-4.5 text-navy-600" />}
        />
        {byStudent.length === 0 ? (
          <EmptyState
            icon={<IconCalendarCheck className="w-6 h-6" />}
            title="Chưa có buổi điểm danh nào trong kỳ này"
            description="Bấm “Tháng trước” ở trên để xem các tháng cũ."
          />
        ) : (
          <div className="divide-y divide-navy-100">
            {byStudent.map((g) => (
              <details key={g.key} className="group">
                <summary className="list-none cursor-pointer px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 hover:bg-ivory-50">
                  <span className="text-ink-400 transition group-open:rotate-90">›</span>
                  <span className="font-semibold text-ink-900 min-w-0 truncate">{g.name}</span>
                  <span className="flex flex-wrap gap-1.5 ml-auto">
                    <StatusChip tone="mint">{g.taught} tiết dạy</StatusChip>
                    {g.trial > 0 && <StatusChip tone="wood">{g.trial} học thử</StatusChip>}
                    {g.missed > 0 && <StatusChip tone="amber">{g.missed} vắng / dời</StatusChip>}
                    {g.late > 0 && <StatusChip tone="coral">{g.late} điểm danh bù</StatusChip>}
                  </span>
                </summary>
                <div className="pb-3">
                  <TableShell>
                    <thead>
                      <tr>
                        <Th>Ngày</Th>
                        <Th>Buổi</Th>
                        <Th>Trạng thái</Th>
                        <Th>Giờ điểm danh</Th>
                        <Th>Nội dung bài</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-100">
                      {g.rows.map((a) => (
                        <tr key={a.id} className="hover:bg-ivory-50 align-top">
                          <td className="px-4 py-2.5 tabular text-ink-700 whitespace-nowrap">
                            {a.session_date.slice(8, 10)}/{a.session_date.slice(5, 7)}
                            {a.is_trial ? <span className="ml-1.5 text-[11px] text-wood-600 font-semibold">thử</span> : null}
                          </td>
                          <td className="px-4 py-2.5 tabular text-ink-700 whitespace-nowrap">
                            {a.is_trial ? "0" : (sessionNumbers.get(a.id) ?? "–")}
                          </td>
                          <td className="px-4 py-2.5">
                            <AttendanceStatusCell row={a} />
                          </td>
                          <td className="px-4 py-2.5 tabular text-ink-500 whitespace-nowrap">
                            {a.check_in_time || "–"}
                            {a.late_checkin ? <span className="block text-[11px] text-coral-600">điểm danh bù</span> : null}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-ink-600 max-w-[320px]">
                            {a.lesson_content || <span className="text-ink-300">–</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableShell>
                  <div className="mt-2 px-4 sm:px-5 flex flex-wrap gap-x-4 gap-y-1">
                    {g.classIds.map((id, i) => (
                      <Link
                        key={id}
                        href={`/admin/classes/${id}`}
                        className="text-sm font-semibold text-wood-600 hover:text-wood-700"
                      >
                        {g.classIds.length > 1 ? `Mở lớp ${i + 1} →` : "Mở trang lớp của học viên →"}
                      </Link>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
