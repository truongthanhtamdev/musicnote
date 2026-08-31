"use client";

import { useState } from "react";
import AttendanceForm from "../attendance-form";
import { AttendanceStatusCell } from "@/components/attendance-status-cell";
import type { AttendanceRow } from "@/lib/types";

export default function TeacherAttendanceHistoryRow({
  row,
}: {
  row: AttendanceRow & { student_name: string };
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr className="bg-gold-50/40">
        <td className="px-4 py-2">{row.session_date}</td>
        <td className="px-4 py-2 font-medium text-slate-900">{row.student_name}</td>
        <td colSpan={4} className="px-4 py-3">
          <AttendanceForm
            classId={row.class_id}
            sessionDate={row.session_date}
            existing={row}
            onSuccess={() => setEditing(false)}
          />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm text-slate-500 hover:text-slate-700 mt-2"
          >
            Đóng
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-2.5">{row.session_date}</td>
      <td className="px-4 py-2.5 font-medium text-slate-900">{row.student_name}</td>
      <td className="px-4 py-2.5">
        <AttendanceStatusCell row={row} />
      </td>
      <td className="px-4 py-2.5 text-slate-500">{row.check_in_time || "-"}</td>
      <td className="px-4 py-2.5 text-slate-600">{row.lesson_content || "-"}</td>
      <td className="px-4 py-2.5 text-slate-500">
        {row.note || "-"}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="block text-gold-600 hover:underline mt-0.5"
        >
          Sửa
        </button>
      </td>
    </tr>
  );
}
