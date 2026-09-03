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
import { IconAlert } from "@/components/icons";
import { Avatar, StatusChip, btn, field } from "@/components/ui";

const initialState: FormState = {};

export default function AttendanceRow({
  row,
  sessionNumber,
}: {
  row: AttendanceRowType & { student_name: string; teacher_name: string };
  /** Buổi thứ mấy của học viên trong gói học. */
  sessionNumber?: number;
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
      <tr className="bg-wood-50/50">
        <td className="px-4 py-3 tabular whitespace-nowrap align-top">{row.session_date}</td>
        <td className="px-4 py-3 font-medium text-ink-900 align-top">{row.student_name}</td>
        <td className="px-4 py-3 text-ink-700 align-top whitespace-nowrap">{row.teacher_name}</td>
        <td colSpan={6} className="px-4 py-3">
          <form action={formAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={row.id} />
            <select
              name="status"
              defaultValue={row.status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              aria-label="Trạng thái"
              className={`${field} w-auto py-1.5`}
            >
              {Object.entries(ATTENDANCE_STATUS_LABELS).map(([v, text]) => (
                <option key={v} value={v}>
                  {text}
                </option>
              ))}
            </select>
            {hasRescheduleInfo(status) && (
              <>
                <input
                  name="rescheduled_to_date"
                  type="date"
                  defaultValue={row.rescheduled_to_date || ""}
                  aria-label="Ngày học bù đã chốt"
                  className={`${field} w-auto py-1.5`}
                />
                <input
                  name="rescheduled_to_time"
                  type="time"
                  defaultValue={row.rescheduled_to_time || ""}
                  aria-label="Giờ đã chốt"
                  className={`${field} w-auto py-1.5`}
                />
              </>
            )}
            <input
              name="lesson_content"
              defaultValue={row.lesson_content || ""}
              placeholder="Nội dung bài học"
              className={`${field} flex-1 min-w-[160px] py-1.5`}
            />
            <label className="flex items-center gap-1.5 text-sm text-ink-700 whitespace-nowrap">
              Buổi thứ
              <input
                name="session_number"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                defaultValue={row.is_trial ? 0 : (sessionNumber ?? "")}
                title="Số buổi đang tính — sửa lại nếu sai. Điền 0 nếu là buổi học thử."
                className={`${field} w-20 py-1.5 tabular`}
              />
              <span className="text-ink-400">(0 = học thử)</span>
            </label>
            <input
              name="note"
              defaultValue={row.note || ""}
              placeholder="Ghi chú"
              className={`${field} flex-1 min-w-[160px] py-1.5`}
            />
            <button type="submit" disabled={pending} className={`${btn.primary} py-1.5`}>
              {pending ? "Đang lưu..." : "Lưu"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={btn.ghost}>
              Huỷ
            </button>
            {state.error && (
              <p className="text-xs text-coral-700 w-full flex items-center gap-1.5">
                <IconAlert className="w-3.5 h-3.5" />
                {state.error}
              </p>
            )}
          </form>
        </td>
      </tr>
    );
  }

  const missingFb = row.status === "completed" && !row.fb_checkin_confirmed;

  return (
    <tr className={row.status === "completed" ? "hover:bg-ivory-50" : "bg-coral-50/30"}>
      <td className="px-4 py-3 tabular whitespace-nowrap text-ink-700">{row.session_date}</td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-2 font-medium text-ink-900 whitespace-nowrap">
          <Avatar name={row.student_name} className="w-7 h-7 text-[10px]" />
          {row.student_name}
        </span>
      </td>
      <td className="px-4 py-3 text-ink-700 whitespace-nowrap">{row.teacher_name}</td>
      <td className="px-4 py-3">
        <AttendanceStatusCell row={row} sessionNumber={sessionNumber} />
      </td>
      <td className="px-4 py-3">
        {row.fb_checkin_confirmed ? (
          <StatusChip tone="mint">Đã check-in</StatusChip>
        ) : missingFb ? (
          <StatusChip tone="amber">Thiếu FB</StatusChip>
        ) : (
          <span className="text-ink-400">–</span>
        )}
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
          className="text-wood-600 hover:text-wood-700 font-semibold"
        >
          Sửa
        </button>
      </td>
    </tr>
  );
}
