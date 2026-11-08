import { requireRole } from "@/lib/guard";
import { getUserById } from "@/lib/auth";
import { firstDayOfMonth, formatVND, lastDayOfMonth, localFromSqlUtc } from "@/lib/format";
import {
  OFFICE_ROLES,
  currentShift,
  getOfficeLocation,
  listOfficeCheckins,
  officeEarnings,
  officePayFor,
} from "@/lib/office-checkin";
import { Card, CardHeader, EmptyState, MetricCard, PageHeader } from "@/components/ui";
import CheckinCamera from "./checkin-camera";

/**
 * Chấm công của chính nhân viên văn phòng: chụp ảnh + vị trí, xem các lần đã
 * chấm trong tháng và số tiền tương ứng.
 */
export default async function OfficeCheckinPage() {
  const session = await requireRole([...OFFICE_ROLES]);
  const user = getUserById(session.userId)!;
  const pay = officePayFor(user);
  const from = firstDayOfMonth();
  const to = lastDayOfMonth();
  const mine = listOfficeCheckins({ from, to, userId: user.id });
  const total = officeEarnings(user.id, from, to);
  const office = getOfficeLocation();

  // Còn trong ca vừa chấm thì chưa cho chấm lần mới.
  const shift = currentShift(user.id);
  const inShift = shift
    ? `Bạn đang trong ca từ ${shift.start} đến ${shift.end}. Hết ca mới chấm công lần tiếp theo được.`
    : null;

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Chấm công"
        subtitle={`Mỗi lần chấm công là 1 ca ${pay.hours} tiếng${
          pay.shiftPay > 0 ? ` = ${formatVND(pay.shiftPay)}` : ""
        }. Chụp ảnh tại ${office ? "văn phòng" : "nơi làm việc"} — web lấy luôn vị trí để xác nhận.`}
      />

      <Card>
        <CheckinCamera disabledReason={inShift} />
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Lần chấm tháng này" value={total.count} unit="lần" />
        <MetricCard label="Số giờ" value={total.hours} unit="giờ" />
        <MetricCard label="Tiền chấm công" value={formatVND(total.amount)} tone="mint" />
      </div>

      <Card padded={false}>
        <CardHeader title="Các lần chấm công tháng này" count={mine.length} />
        {mine.length === 0 ? (
          <EmptyState title="Chưa chấm công lần nào trong tháng" description="Bấm mở camera ở trên để chấm công." />
        ) : (
          <ul className="divide-y divide-navy-100">
            {mine.map((c) => {
              const at = localFromSqlUtc(c.checked_at);
              return (
                <li key={c.id} className={`flex items-center gap-3 px-5 py-3 ${c.voided ? "opacity-60" : ""}`}>
                  {c.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/admin/cong-van-phong/photo/${c.id}`}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold text-ink-900 tabular">
                      {at.slice(8, 10)}/{at.slice(5, 7)} lúc {at.slice(11, 16)}
                    </p>
                    <p className="text-xs text-ink-500">
                      {c.hours} tiếng
                      {c.voided ? ` · Đã bị huỷ${c.void_reason ? `: ${c.void_reason}` : ""}` : ""}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold tabular ${c.voided ? "line-through text-ink-400" : "text-ink-900"}`}>
                    {formatVND(c.amount)}
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
