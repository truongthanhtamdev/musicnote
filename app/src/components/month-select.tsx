"use client";

import { useRouter } from "next/navigation";

/**
 * Ô chọn nhanh một tháng bất kỳ — chọn xong là trang lọc theo tháng đó luôn.
 * `months` là danh sách "YYYY-MM", mới nhất trước.
 */
export function MonthSelect({ months, from, to }: { months: string[]; from: string; to: string }) {
  const router = useRouter();
  const value = months.find((m) => from === `${m}-01` && to.startsWith(m)) ?? "";

  return (
    <select
      value={value}
      onChange={(e) => {
        const m = e.target.value;
        if (!m) return;
        const [y, mo] = m.split("-").map(Number);
        const last = new Date(y, mo, 0).getDate();
        router.push(`?from=${m}-01&to=${m}-${String(last).padStart(2, "0")}`);
      }}
      aria-label="Chọn tháng"
      className="rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-ink-700"
    >
      {!value && <option value="">Khoảng ngày tự chọn</option>}
      {months.map((m) => (
        <option key={m} value={m}>
          Tháng {Number(m.slice(5, 7))}/{m.slice(0, 4)}
        </option>
      ))}
    </select>
  );
}
