import { requireRole } from "@/lib/guard";
import { MANAGE_ROLES } from "@/lib/types";
import { firstDayOfMonth, formatVND, lastDayOfMonth } from "@/lib/format";
import { getBonusRates, listBonuses, listUnrewardedTrials, type BonusRow } from "@/lib/bonus";
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  TableShell,
  Th,
  btn,
  field,
  label,
} from "@/components/ui";
import { IconWallet } from "@/components/icons";
import DeleteBonusButton from "./delete-bonus-button";
import RescanButton from "./rescan-button";
import Link from "next/link";

const KIND_LABEL: Record<BonusRow["kind"], string> = {
  trial: "Học thử",
  conversion: "Chốt lớp",
  manual: "Ghi tay",
};

/**
 * Thưởng giáo vụ theo kỳ.
 *
 * Số hiện ở đây đọc từ các khoản đã ghi chứ không tính lại từ đầu — đổi mức
 * thưởng trong Cài đặt không làm đổi số của kỳ đã qua.
 */
export default async function BonusPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(MANAGE_ROLES);
  const sp = await searchParams;
  const from = sp.from || firstDayOfMonth();
  const to = sp.to || lastDayOfMonth();

  const rates = getBonusRates();
  const staff = listBonuses(from, to);
  const unrewarded = listUnrewardedTrials(from, to);
  const grand = staff.reduce((sum, s) => sum + s.total, 0);
  const trials = staff.reduce((sum, s) => sum + s.trial_count, 0);
  const conversions = staff.reduce((sum, s) => sum + s.conversion_count, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Thưởng giáo vụ"
        subtitle={`Mỗi buổi học thử dạy xong ${formatVND(rates.trial)}, khách đóng tiền lần đầu cộng thêm ${formatVND(rates.conversion)} — một khách đi trọn đường là ${formatVND(rates.trial + rates.conversion)}. Hệ thống tự ghi khi sự việc xảy ra; sửa mức trong Cài đặt chỉ áp cho khoản mới.`}
      />

      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <div>
            <label className={label} htmlFor="b-from">
              Từ ngày
            </label>
            <input id="b-from" type="date" name="from" defaultValue={from} className={`${field} w-auto`} />
          </div>
          <div>
            <label className={label} htmlFor="b-to">
              Đến ngày
            </label>
            <input id="b-to" type="date" name="to" defaultValue={to} className={`${field} w-auto`} />
          </div>
          <button type="submit" className={btn.primary}>
            Xem kỳ này
          </button>
        </form>
      </Card>

      {/* Buổi học thử bị sót thưởng. Khoản chỉ được ghi đúng lúc điểm danh,
          nên lớp gán giáo vụ muộn hay dữ liệu sửa tay là rơi rớt — bảng này
          lôi hết ra kèm lý do, khỏi phải ngồi dò "hình như thiếu một lớp". */}
      {unrewarded.length > 0 && (
        <Card padded={false} className="border-amber-200">
          <CardHeader title="Buổi học thử chưa có thưởng" count={unrewarded.length} />
          <div className="p-5 space-y-3">
            <ul className="space-y-2 text-sm">
              {unrewarded.map((u) => (
                <li key={u.attendance_id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-ink-900">{u.student_name}</span>
                  <span className="text-ink-500 tabular">{u.session_date}</span>
                  {u.coordinator_id ? (
                    <span className="text-mint-700">
                      → sẽ ghi cho {u.coordinator_name} khi bấm nút dưới
                    </span>
                  ) : (
                    <span className="text-amber-700">
                      lớp chưa gán giáo vụ —{" "}
                      <Link
                        href={`/admin/classes/${u.class_id}`}
                        className="font-semibold underline hover:text-amber-900"
                      >
                        gán ngay
                      </Link>{" "}
                      rồi quay lại bấm ghi bổ sung
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {unrewarded.some((u) => u.coordinator_id) && <RescanButton from={from} to={to} />}
            <p className="text-xs text-ink-500">
              Bấm nhiều lần vô hại — mỗi buổi chỉ ghi được đúng một khoản. Khoản bạn đã Gỡ tay
              cũng hiện lại ở đây; không muốn ghi lại thì đừng bấm.
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ["Tổng thưởng kỳ này", formatVND(grand)],
          ["Buổi học thử", String(trials)],
          ["Lần chốt lớp", String(conversions)],
        ].map(([k, v]) => (
          <Card key={k}>
            <p className="text-sm text-ink-500">{k}</p>
            <p className="text-2xl font-bold text-ink-900 tabular mt-1">{v}</p>
          </Card>
        ))}
      </div>

      {staff.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<IconWallet className="w-7 h-7" />}
            title="Chưa có khoản thưởng nào trong kỳ"
            description="Khoản thưởng tự ghi khi giáo viên điểm danh buổi học thử là Đã dạy, hoặc khi ghi khoản thu đầu tiên của khách. Lớp chưa gán giáo vụ phụ trách thì không ghi được cho ai."
          />
        </Card>
      ) : (
        staff.map((s) => (
          <Card key={s.staff_id} padded={false}>
            <CardHeader
              title={s.staff_name}
              count={formatVND(s.total)}
              icon={<IconWallet className="w-5 h-5" />}
            />
            <div className="px-5 pt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-600">
              <span>
                Học thử: <span className="font-semibold text-ink-900">{s.trial_count}</span> buổi ·{" "}
                {formatVND(s.trial_total)}
              </span>
              <span>
                Chốt lớp: <span className="font-semibold text-ink-900">{s.conversion_count}</span> lần ·{" "}
                {formatVND(s.conversion_total)}
              </span>
              {s.manual_total !== 0 && <span>Ghi tay: {formatVND(s.manual_total)}</span>}
            </div>
            <div className="mt-3">
              <TableShell>
                <thead>
                  <tr>
                    <Th>Ngày</Th>
                    <Th>Loại</Th>
                    <Th>Nội dung</Th>
                    <Th className="text-right">Số tiền</Th>
                    <Th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map((r) => (
                    <tr key={r.id} className="border-t border-navy-100">
                      <td className="px-4 py-2.5 text-sm text-ink-700 tabular whitespace-nowrap">
                        {r.earned_at}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            r.kind === "conversion"
                              ? "bg-mint-50 text-mint-700"
                              : r.kind === "trial"
                                ? "bg-wood-50 text-wood-700"
                                : "bg-ivory-100 text-ink-600"
                          }`}
                        >
                          {KIND_LABEL[r.kind]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-ink-600">{r.note ?? "—"}</td>
                      <td className="px-4 py-2.5 text-sm font-semibold text-ink-900 tabular text-right whitespace-nowrap">
                        {formatVND(r.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <DeleteBonusButton id={r.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
