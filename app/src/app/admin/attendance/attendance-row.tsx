"use client";

import { useActionState, useState } from "react";
import { correctAttendanceAction } from "@/actions/attendance";
import type { FormState } from "@/actions/teachers";
import {
  ATTENDANCE_STATUS_LABELS,
  hasRescheduleInfo,
  type AttendanceRow as AttendanceRowType,
  type AttendanceStatus,
} from "@/lib/types";
import { AttendanceStatusCell } from "@/components/attendance-status-cell";

const initialState: FormState = {};

export default function AttendanceRow({
  row,
}: {
  row: AttendanceRowType & { student_name: string; teacher_name: string };
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<AttendanceStatus>(row.status);
  const [state, formAction, pending] = useActionState(correctAttendanceAction, initialState);

  // Close the edit form once a save succeeds. Adjusting state during render
  // (rather than in an effect) avoids an extra commit-then-rerender pass.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setEditing(false);
  }

  if (editing) {
    return (
      <tr className="bg-gold-50/40">
        <td className="px-4 py-2">{row.session_date}</td>
        <td className="px-4 py-2">{row.student_name}</td>
        <td className="px-4 py-2">{row.teacher_name}</td>
        <td colSpan={6} className="px-4 py-2">
          <form action={formAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={row.id} />
            <select
              name="status"
              defaultValue={row.status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
            >
              {Object.entries(ATTENDANCE_STATUS_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            {hasRescheduleInfo(status) && (
              <>
                <input
                  name="rescheduled_to_date"
                  type="date"
                  defaultValue={row.rescheduled_to_date || ""}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                />
                <input
                  name="rescheduled_to_time"
                  type="time"
                  defaultValue={row.rescheduled_to_time || ""}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                />
              </>
            )}
            <input
              name="lesson_content"
              defaultValue={row.lesson_content || ""}
              placeholder="Nội dung bài học"
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm flex-1 min-w-[160px]"
            />
            <label className="flex items-center gap-1.5 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_trial"
                defaultChecked={!!row.is_trial}
                className="w-4 h-4 rounded border-slate-300"
              />
              Buổi thử (50k)
            </label>
            <input
              name="note"
              defaultValue={row.note || ""}
              placeholder="Ghi chú"
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm flex-1 min-w-[160px]"
            />
            <button
              type="submit"
              disabled={pending}
              className="text-sm bg-gold-600 hover:bg-gold-700 text-white rounded-lg px-3 py-1"
            >
              {pending ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Huỷ
            </button>
            {state.error && <p className="text-xs text-red-600 w-full">{state.error}</p>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-2">{row.session_date}</td>
      <td className="px-4 py-2 font-medium text-slate-900">{row.student_name}</td>
      <td className="px-4 py-2">{row.teacher_name}</td>
      <td className="px-4 py-2">
        <AttendanceStatusCell row={row} />
      </td>
      <td className="px-4 py-2">{row.fb_checkin_confirmed ? "✔" : "-"}</td>
      <td className="px-4 py-2 text-slate-500">{row.check_in_time || "-"}</td>
      <td className="px-4 py-2 text-slate-600">{row.lesson_content || "-"}</td>
      <td className="px-4 py-2 text-slate-500">{row.note || "-"}</td>
      <td className="px-4 py-2 text-right">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-gold-600 hover:underline"
        >
          Sửa
        </button>
      </td>
    </tr>
  );
}
