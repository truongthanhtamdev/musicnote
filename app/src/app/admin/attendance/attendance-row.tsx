"use client";

import { useActionState, useState } from "react";
import { correctAttendanceAction } from "@/actions/attendance";
import type { FormState } from "@/actions/teachers";
import { ATTENDANCE_STATUS_LABELS, type AttendanceRow as AttendanceRowType } from "@/lib/types";

const initialState: FormState = {};

export default function AttendanceRow({
  row,
}: {
  row: AttendanceRowType & { student_name: string; teacher_name: string };
}) {
  const [editing, setEditing] = useState(false);
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
      <tr className="bg-indigo-50/40">
        <td className="px-4 py-2">{row.session_date}</td>
        <td className="px-4 py-2">{row.student_name}</td>
        <td className="px-4 py-2">{row.teacher_name}</td>
        <td colSpan={5} className="px-4 py-2">
          <form action={formAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={row.id} />
            <select
              name="status"
              defaultValue={row.status}
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
            >
              {Object.entries(ATTENDANCE_STATUS_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <input
              name="note"
              defaultValue={row.note || ""}
              placeholder="Ghi chú"
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm flex-1 min-w-[160px]"
            />
            <button
              type="submit"
              disabled={pending}
              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-1"
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
      <td className="px-4 py-2">{ATTENDANCE_STATUS_LABELS[row.status]}</td>
      <td className="px-4 py-2">{row.fb_checkin_confirmed ? "✔" : "-"}</td>
      <td className="px-4 py-2 text-slate-500">{row.check_in_time || "-"}</td>
      <td className="px-4 py-2 text-slate-500">{row.note || "-"}</td>
      <td className="px-4 py-2 text-right">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-indigo-600 hover:underline"
        >
          Sửa
        </button>
      </td>
    </tr>
  );
}
