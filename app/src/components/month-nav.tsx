import Link from "next/link";
import { monthRangeOf, todayISO } from "@/lib/format";

/**
 * Hai nút chuyển kỳ nhanh cho trang lọc theo tháng.
 *
 * Sinh ra từ một hiểu nhầm có thật: sang mùng 1, bộ lọc mặc định dời theo
 * tháng mới, giáo viên mở trang Thu nhập không thấy buổi 30 của tháng trước
 * và tưởng dữ liệu bị xoá. Có nút "Tháng trước" ngay đó thì bấm một phát là
 * thấy lại, khỏi phải tự gõ hai ô ngày.
 */
export function MonthNav({ from }: { from: string }) {
  const prev = monthRangeOf(from, -1);
  const current = monthRangeOf(todayISO());
  const prevLabel = `Tháng ${Number(prev.from.slice(5, 7))}/${prev.from.slice(0, 4)}`;

  const cls =
    "inline-flex items-center gap-1 rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ivory-100 transition";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`?from=${prev.from}&to=${prev.to}`} className={cls}>
        ← {prevLabel}
      </Link>
      {from !== current.from && (
        <Link href={`?from=${current.from}&to=${current.to}`} className={cls}>
          Tháng này
        </Link>
      )}
      <span className="text-xs text-ink-400 w-full sm:w-auto">
        Sang tháng mới số liệu không mất — chỉ là bộ lọc chuyển theo tháng.
      </span>
    </div>
  );
}
