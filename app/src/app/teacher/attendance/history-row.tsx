"use client";

import { useState } from "react";
import AttendanceForm from "../attendance-form";
import { AttendanceStatusCell } from "@/components/attendance-status-cell";
import { Avatar, btn } from "@/components/ui";
import type { AttendanceRow } from "@/lib/types";

export default function TeacherAttendanceHistoryRow({
  row,
  sessionNumber,
}: {
  row: AttendanceRow & { student_name: string };
  /** Buổi thứ mấy của học viên trong gói học. */
  sessionNumber?: number;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr className="bg-wood-50/50">
        <td className="px-4 py-3 tabular whitespace-nowrap align-top">{row.session_date}</td>
        <td className="px-4 py-3 font-medium text-ink-900 align-top">{row.student_name}</td>
        <td colSpan={5} className="px-4 py-3">
          <div className="max-w-xl">
            <AttendanceForm
              classId={row.class_id}
              sessionDate={row.session_date}
              existing={row}
              onSuccess={() => setEditing(false)}
            />
            <button type="button" onClick={() => setEditing(false)} className={`${btn.ghost} mt-2`}>
              Đóng
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-ivory-50">
      <td className="px-4 py-3 tabular text-ink-700 whitespace-nowrap">{row.session_date}</td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-2 font-medium text-ink-900 whitespace-nowrap">
          <Avatar name={row.student_name} className="w-7 h-7 text-[10px]" />
          {row.student_name}
        </span>
      </td>
      <td className="px-4 py-3">
        <AttendanceStatusCell row={row} sessionNumber={sessionNumber} />
      </td>
      <td className="px-4 py-3 tabular text-ink-500">{row.check_in_time || "–"}</td>
      <td className="px-4 py-3 text-ink-600 max-w-[220px]">
        <span className="block truncate" title={row.lesson_content || undefined}>
          {row.lesson_content || "–"}
        </span>
      </td>
      <td className="px-4 py-3 text-ink-500 max-w-[160px]">
        <span className="block truncate" title={row.note || undefined}>
          {row.note || "–"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-wood-600 hover:text-wood-700 font-semibold text-sm"
        >
          Sửa
        </button>
      </td>
    </tr>
  );
}
