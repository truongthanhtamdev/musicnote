"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { IconAlert, SubjectIcon } from "@/components/icons";
import { Card, CardHeader, StatusChip } from "@/components/ui";
import AttendanceForm from "./attendance-form";

export interface MissedRow {
  classId: number;
  studentName: string;
  subject: string;
  date: string;
  /** "T5 12/09" */
  dayLabel: string;
  timeRange: string;
  daysLate: number;
  /** Buổi thứ mấy điền sẵn cho form điểm danh bù. */
  sessionNumber?: number;
  /** Nhóm Messenger của lớp — gửi bản sao điểm danh. */
  messengerUrl?: string | null;
}

function lateLabel(daysLate: number): string {
  if (daysLate === 0) return "Quá giờ hôm nay";
  if (daysLate === 1) return "Trễ 1 ngày";
  return `Trễ ${daysLate} ngày`;
}

/**
 * Danh sách buổi đã dạy xong mà chưa điểm danh, tô đậm ngay đầu trang để giáo
 * viên không bỏ sót — mỗi buổi thiếu là khách hàng không đọc được nội dung bài
 * học của buổi đó, và theo quy định thì buổi điểm danh bù vượt hạn mức sẽ
 * không được tính công.
 */
export default function MissedCheckinPanel({
  rows,
  quota,
}: {
  rows: MissedRow[];
  /** Số lần điểm danh bù còn được tha trong kỳ lương. */
  quota: number;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Danh sách dài thì chỉ hiện 3 buổi trễ gần nhất, còn lại bấm "Xem thêm" —
  // để lớp hôm nay không bị đẩy xuống tít cuối trang.
  const [showAll, setShowAll] = useState(false);
  if (rows.length === 0) return null;
  const visible = showAll ? rows : rows.slice(0, 3);

  const active = openIndex === null ? null : rows[openIndex];

  return (
    <Card padded={false} className="border-2 border-coral-300">
      <CardHeader
        title="Buổi chưa điểm danh — cần điểm danh bù"
        count={rows.length}
        icon={<IconAlert className="w-5 h-5" />}
        tone="warning"
      />

      <ul className="divide-y divide-coral-100">
        {visible.map((r, i) => (
          <li
            key={`${r.classId}-${r.date}`}
            className="px-5 py-4 bg-coral-50/60 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-bold text-coral-800 flex items-center gap-2">
                <SubjectIcon subject={r.subject} className="w-5 h-5 shrink-0" />
                <span className="truncate">
                  {r.studentName} · {r.dayLabel} · {r.timeRange}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <StatusChip tone="coral" icon={<IconAlert className="w-3.5 h-3.5" />}>
                {lateLabel(r.daysLate)}
              </StatusChip>
              <button
                type="button"
                onClick={() => setOpenIndex(i)}
                className="inline-flex items-center justify-center rounded-xl bg-coral-600 hover:bg-coral-700 text-white font-semibold px-4 py-2 text-sm transition"
              >
                Điểm danh bù
              </button>
            </div>
          </li>
        ))}
      </ul>

      {rows.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full px-5 py-2.5 border-t border-coral-100 bg-white text-sm font-semibold text-coral-700 hover:bg-coral-50"
        >
          {showAll ? "Thu gọn" : `Xem thêm ${rows.length - 3} buổi`}
        </button>
      )}

      <p className="px-5 py-3 border-t border-coral-100 bg-white text-sm text-ink-600 leading-relaxed">
        Điểm danh và ghi nội dung bài học ngay trong buổi là việc bắt buộc — phụ huynh đọc phần
        nội dung này trong trang học viên. Theo quy định, mỗi kỳ lương được điểm danh bù tối đa{" "}
        <span className="font-semibold text-ink-900">{quota} lần</span>; từ lần thứ {quota + 1} trở
        đi buổi đó <span className="font-semibold text-ink-900">không được tính công</span>.
      </p>

      <Modal
        open={active !== null}
        onClose={() => setOpenIndex(null)}
        title="Điểm danh bù"
        subtitle={
          active ? `${active.studentName} · ${active.dayLabel} · ${active.timeRange}` : undefined
        }
      >
        {active && (
          <AttendanceForm
            classId={active.classId}
            sessionDate={active.date}
            sessionNumber={active.sessionNumber}
            onSuccess={() => setOpenIndex(null)}
          />
        )}
      </Modal>
    </Card>
  );
}
