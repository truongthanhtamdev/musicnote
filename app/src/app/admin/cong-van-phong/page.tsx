import { requireRole } from "@/lib/guard";
import { db } from "@/lib/db";
import { MANAGE_ROLES, ROLE_LABELS, type Role } from "@/lib/types";
import { firstDayOfMonth, formatVND, lastDayOfMonth, localFromSqlUtc, monthRangeOf, todayISO } from "@/lib/format";
import { getOfficeLocation, listOfficeCheckins, officeSummary } from "@/lib/office-checkin";
import { MonthSelect } from "@/components/month-select";
import { MonthNav } from "@/components/month-nav";
import { Card, CardHeader, EmptyState, MetricCard, PageHeader, TableShell, Th } from "@/components/ui";
import { OfficeLocationForm, PayEditor, ShiftAmountEditor, VoidButton } from "./widgets";

/**
 * Bảng công văn phòng cho Quản lý: tổng theo người trong tháng, mức lương
 * chấm công từng người, vị trí văn phòng, và từng lần chấm kèm ảnh + vị trí.
 */
export default async function OfficeTimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(MANAGE_ROLES);
  const sp = await searchParams;
  const from = sp.from || firstDayOfMonth();
  const to = sp.to || lastDayOfMonth();

  const summary = officeSummary(from, to);
  const checkins = listOfficeCheckins({ from, to });
  const office = getOfficeLocation();
  const totalAmount = summary.reduce((s, r) => s + r.amount, 0);
  const totalCount = summary.reduce((s, r) => s + r.count, 0);

  // Các tháng để chọn: từ lần chấm công đầu tiên tới tháng này.
  const thisMonth = monthRangeOf(todayISO()).from.slice(0, 7);
  const first = (db.prepare("SELECT MIN(work_date) AS d FROM office_checkins").get() as { d: string | null }).d;
  const months: string[] = [];
  for (let m = thisMonth; months.length < 36; ) {
    months.push(m);
    if (!first || m <= first.slice(0, 7)) break;
    m = monthRangeOf(`${m}-01`, -1).from.slice(0, 7);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Công văn phòng"
        subtitle="Nhân viên văn phòng chấm công bằng ảnh chụp + vị trí. Mỗi lần chấm là 1 ca, tính theo lương 1 ca của người đó — chỉnh ở bảng dưới; từng ca đã chấm cũng sửa được riêng."
      />

      <div className="flex flex-wrap items-center gap-2">
        <MonthSelect months={months} from={from} to={to} />
        <MonthNav from={from} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard label="Tổng lương chấm công" value={formatVND(totalAmount)} tone="mint" />
        <MetricCard label="Số lần chấm công" value={totalCount} unit="lần" />
        <MetricCard
          label="Vị trí văn phòng"
          value={office ? "Đã đặt" : "Chưa đặt"}
          hint={office ? `bán kính ${office.radius} m` : "chưa kiểm tra vị trí khi chấm"}
        />
      </div>

      <Card padded={false}>
        <CardHeader title="Bảng công theo người" count={summary.length} />
        <TableShell stackOnMobile>
          <thead>
            <tr>
              <Th>Nhân viên</Th>
              <Th className="text-right">Số lần</Th>
              <Th className="text-right">Ngày</Th>
              <Th className="text-right">Giờ</Th>
              <Th className="text-right">Tiền</Th>
              <Th>Lương 1 ca</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {summary.map((r) => (
              <tr key={r.userId}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{r.name}</p>
                  <p className="text-xs text-ink-500">{ROLE_LABELS[r.role as Role]}</p>
                </td>
                <td className="px-4 py-3 text-right tabular">{r.count}</td>
                <td className="px-4 py-3 text-right tabular">{r.days}</td>
                <td className="px-4 py-3 text-right tabular">{r.hours}</td>
                <td className="px-4 py-3 text-right font-semibold tabular">{formatVND(r.amount)}</td>
                <td className="px-4 py-3">
                  <PayEditor userId={r.userId} shiftPay={r.pay.shiftPay} hours={r.pay.hours} />
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Card>

      <Card padded={false}>
        <CardHeader title="Vị trí văn phòng" />
        <div className="p-5 space-y-3">
          <p className="text-sm text-ink-600">
            {office ? (
              <>
                Đang đặt tại{" "}
                <a
                  href={`https://www.google.com/maps?q=${office.lat},${office.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-wood-700 hover:underline"
                >
                  {office.lat.toFixed(5)}, {office.lng.toFixed(5)}
                </a>
                . Nhân viên chỉ chấm công được khi ở trong bán kính {office.radius} m quanh điểm này.
              </>
            ) : (
              <>Chưa đặt — nhân viên chấm công ở đâu cũng được (vẫn lưu vị trí để bạn xem). Đứng ở văn phòng rồi bấm nút dưới để đặt.</>
            )}
          </p>
          <OfficeLocationForm radius={office?.radius ?? 150} />
        </div>
      </Card>

      <Card padded={false}>
        <CardHeader title="Từng lần chấm công" count={checkins.length} />
        {checkins.length === 0 ? (
          <EmptyState title="Chưa có lần chấm công nào trong kỳ này" />
        ) : (
          <ul className="divide-y divide-navy-100">
            {checkins.map((c) => {
              const at = localFromSqlUtc(c.checked_at);
              const far = office && c.distance_m != null && c.distance_m > office.radius;
              return (
                <li key={c.id} className={`flex flex-wrap items-center gap-3 px-5 py-3 ${c.voided ? "opacity-60" : ""}`}>
                  {c.photo && (
                    <a href={`/admin/cong-van-phong/photo/${c.id}`} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/admin/cong-van-phong/photo/${c.id}`}
                        alt={`Ảnh chấm công của ${c.user_name}`}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    </a>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold text-ink-900">{c.user_name}</p>
                    <p className="text-xs text-ink-500 tabular">
                      {at.slice(8, 10)}/{at.slice(5, 7)} lúc {at.slice(11, 16)} · {c.hours} tiếng
                    </p>
                    <p className={`text-xs ${far ? "text-coral-600" : "text-ink-500"}`}>
                      {c.lat != null && c.lng != null ? (
                        <a
                          href={`https://www.google.com/maps?q=${c.lat},${c.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          📍 {c.distance_m != null ? `cách văn phòng ${Math.round(c.distance_m)} m` : "xem vị trí"}
                          {c.accuracy_m ? ` (sai số ±${Math.round(c.accuracy_m)} m)` : ""}
                        </a>
                      ) : (
                        "không có vị trí"
                      )}
                    </p>
                    {c.voided === 1 && (
                      <p className="text-xs text-coral-600">Đã huỷ{c.void_reason ? `: ${c.void_reason}` : ""}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold tabular ${c.voided ? "line-through text-ink-400" : "text-ink-900"}`}>
                      {formatVND(c.amount)}
                    </span>
                    {!c.voided && <ShiftAmountEditor id={c.id} amount={c.amount} hours={c.hours} />}
                    <VoidButton id={c.id} voided={c.voided === 1} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
