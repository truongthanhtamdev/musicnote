"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatClassSchedule, type ClassRow } from "@/lib/types";
import { IconSearch } from "@/components/icons";
import { EmptyState, field } from "@/components/ui";
import { IconClasses } from "@/components/icons";

/**
 * Danh sách lớp của một giáo viên kèm ô tìm nhanh. Giáo viên dạy vài chục lớp
 * thì cuộn tay tìm rất mệt, nên lọc ngay tại chỗ theo tên học viên, tên khách
 * hàng, bộ môn hoặc lịch học ("T3", "15:00").
 */
export default function TeacherClassList({ classes }: { classes: ClassRow[] }) {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return classes;
    return classes.filter((c) =>
      [c.student_name, c.guardian_name ?? "", c.subject, formatClassSchedule(c)]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [classes, q]);

  return (
    <>
      <div className="px-5 pb-3 pt-1 relative">
        <IconSearch className="w-4 h-4 absolute left-8 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm học viên, bộ môn hoặc giờ học..."
          aria-label="Tìm lớp của giáo viên này"
          className={`${field} pl-9`}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<IconClasses className="w-6 h-6" />}
          title={q ? "Không có lớp nào khớp" : "Chưa được giao lớp nào"}
          description={
            q ? `Không tìm thấy lớp nào cho "${q}".` : "Giao lớp cho giáo viên này ở trang Giao lớp."
          }
        />
      ) : (
        <ul className="divide-y divide-navy-100 max-h-80 overflow-y-auto scroll-thin">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/classes/${c.id}`}
                className="px-5 py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-ivory-50 transition"
              >
                <span className="font-medium text-ink-900 truncate">{c.student_name}</span>
                <span className="text-ink-500 tabular shrink-0">{formatClassSchedule(c)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {q && rows.length > 0 && (
        <p className="px-5 py-2 text-xs text-ink-400 border-t border-navy-100">
          {rows.length}/{classes.length} lớp khớp với &ldquo;{q}&rdquo;
        </p>
      )}
    </>
  );
}
