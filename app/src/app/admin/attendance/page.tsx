import Link from "next/link";
import { listAttendance, listTeachers, sessionNumberMap } from "@/lib/queries";
import { todayISO, addDays, toISODate } from "@/lib/format";
import { IconAlert, IconCalendarCheck, IconCheckCircle, IconFilter } from "@/components/icons";
import {
  Card,
  EmptyState,
  MetricCard,
  PageHeader,
  TableShell,
  Th,
  btn,
  field,
  label,
} from "@/components/ui";
import AttendanceRow from "./attendance-row";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string; from?: string; to?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const teachers = listTeachers(true);

  const defaultFrom = toISODate(addDays(new Date(), -7));
  const from = sp.from || defaultFrom;
  const to = sp.to || todayISO();
  const teacherId = sp.teacherId ? Number(sp.teacherId) : undefined;

  const all = listAttendance({ teacherId, from, to });
  const rows = sp.status
    ? all.filter((a) =>
        sp.status === "abnormal" ? a.status !== "completed" : a.status === "completed"
      )
    : all;

  const sessionNumbers = sessionNumberMap([...new Set(all.map((a) => a.class_id))]);
  const doneCount = all.filter((a) => a.status === "completed").length;
  const abnormal = all.length - doneCount;
  const noFb = all.filter((a) => a.status === "completed" && !a.fb_checkin_confirmed).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lịch & điểm danh"
        subtitle="Đối chiếu ghi nhận của hệ thống với check-in trên nhóm Facebook. Trang này để kiểm tra, không dùng để duyệt công."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Tổng số tiết ghi nhận"
          value={all.length}
          unit="tiết"
          hint={`${from} → ${to}`}
          icon={<IconCalendarCheck className="w-5 h-5" />}
        />
        <MetricCard
          label="Đã dạy"
          value={doneCount}
          unit="tiết"
          hint={all.length ? `${Math.round((doneCount / all.length) * 100)}% số tiết` : undefined}
          tone="mint"
          icon={<IconCheckCircle className="w-5 h-5" />}
        />
        <MetricCard
          label="Bất thường"
          value={abnormal}
          unit="tiết"
          hint="GV vắng, HS vắng hoặc dời lịch"
          tone={abnormal ? "coral" : "navy"}
          icon={<IconAlert className="w-5 h-5" />}
        />
        <MetricCard
          label="Thiếu check-in Facebook"
          value={noFb}
          unit="tiết"
          hint="Đã dạy nhưng chưa xác nhận FB"
          tone={noFb ? "amber" : "navy"}
          icon={<IconAlert className="w-5 h-5" />}
        />
      </div>

      <Card padded={false}>
        <form className="p-4 border-b border-navy-100 flex flex-wrap gap-3 items-end">
          <div>
            <label className={label} htmlFor="f-teacher">
              Giáo viên
            </label>
            <select
              id="f-teacher"
              name="teacherId"
              defaultValue={teacherId || ""}
              className={`${field} w-auto`}
            >
              <option value="">Tất cả</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="f-status">
              Trạng thái
            </label>
            <select
              id="f-status"
              name="status"
              defaultValue={sp.status || ""}
              className={`${field} w-auto`}
            >
              <option value="">Tất cả</option>
              <option value="completed">Đã dạy</option>
              <option value="abnormal">Bất thường</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="f-from">
              Từ ngày
            </label>
            <input
              id="f-from"
              type="date"
              name="from"
              defaultValue={from}
              className={`${field} w-auto`}
            />
          </div>
          <div>
            <label className={label} htmlFor="f-to">
              Đến ngày
            </label>
            <input id="f-to" type="date" name="to" defaultValue={to} className={`${field} w-auto`} />
          </div>
          <button type="submit" className={btn.primary}>
            <IconFilter className="w-4 h-4" />
            Lọc
          </button>
          <Link href="/admin/attendance" className={btn.ghost}>
            Xoá lọc
          </Link>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            icon={<IconCalendarCheck className="w-6 h-6" />}
            title="Không có dữ liệu trong khoảng thời gian này"
            description="Thử mở rộng khoảng ngày hoặc bỏ bớt bộ lọc giáo viên."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Ngày</Th>
                <Th>Học viên</Th>
                <Th>Giáo viên</Th>
                <Th>Trạng thái</Th>
                <Th>Check-in FB</Th>
                <Th>Giờ điểm danh</Th>
                <Th>Nội dung bài học</Th>
                <Th>Ghi chú</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {rows.map((a) => (
                <AttendanceRow key={a.id} row={a} sessionNumber={sessionNumbers.get(a.id)} />
              ))}
            </tbody>
          </TableShell>
        )}

        {rows.length > 0 && (
          <div className="px-4 py-3 border-t border-navy-100 text-sm text-ink-500 tabular">
            Hiển thị {rows.length} bản ghi
          </div>
        )}
      </Card>
    </div>
  );
}
