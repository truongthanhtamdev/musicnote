"use client";

import { useActionState } from "react";
import { markAttendanceAction } from "@/actions/attendance";
import type { FormState } from "@/actions/teachers";
import { ATTENDANCE_STATUS_LABELS, type AttendanceRow } from "@/lib/types";

const initialState: FormState = {};

export default function AttendanceForm({
  classId,
  sessionDate,
  existing,
}: {
  classId: number;
  sessionDate: string;
  existing?: AttendanceRow;
}) {
  const [state, formAction, pending] = useActionState(markAttendanceAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="session_date" value={sessionDate} />
      <select
        name="status"
        defaultValue={existing?.status || "completed"}
        className="rounded-lg border border-slate-300 px-2 py-1.5"
      >
        {Object.entries(ATTENDANCE_STATUS_LABELS).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1.5 text-slate-600">
        <input
          type="checkbox"
          name="fb_checkin_confirmed"
          defaultChecked={!!existing?.fb_checkin_confirmed}
        />
        Đã điểm danh trên Facebook
      </label>
      <input
        name="note"
        defaultValue={existing?.note || ""}
        placeholder="Ghi chú (không bắt buộc)"
        className="rounded-lg border border-slate-300 px-2 py-1.5 flex-1 min-w-[140px]"
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg px-3 py-1.5"
      >
        {pending ? "Đang lưu..." : existing ? "Cập nhật" : "Điểm danh"}
      </button>
      {state.error && <p className="text-red-600 text-xs w-full">{state.error}</p>}
      {state.success && <p className="text-emerald-600 text-xs w-full">Đã lưu điểm danh.</p>}
    </form>
  );
}
