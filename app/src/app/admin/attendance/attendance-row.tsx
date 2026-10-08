"use client";

import { useActionState, useState, useTransition } from "react";
import { correctAttendanceAction, deleteAttendanceAction } from "@/actions/attendance";
import type { FormState } from "@/actions/teachers";
import {
  ATTENDANCE_STATUS_LABELS,
  hasRescheduleInfo,
  shortDayLabel,
  type AttendanceStatus,
} from "@/lib/types";
import type { AttendanceWithContext } from "@/lib/queries";
import { AttendanceStatusCell } from "@/components/attendance-status-cell";
import { IconAlert } from "@/components/icons";
import { Avatar, StatusChip, btn, field, inlineAction } from "@/components/ui";
import { RatingLinkButton } from "@/components/rating-link-button";
import { TimeSelect } from "@/components/time-select";
import { SessionNumberField } from "@/components/session-number-field";

const initialState: FormState = {};

export default function AttendanceRow({
  row,
  sessionNumber,
}: {
  row: AttendanceWithContext;
  /** Buổi thứ mấy của học viên trong gói học. */
  sessionNumber?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<AttendanceStatus>(row.status);
  const [state, formAction, pending] = useActionState(correctAttendanceAction, initialState);
  const [deleting, startDelete] = useTransition();

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
        <td className="px-4 py-3 tabular whitespace-nowrap align-top hidden sm:table-cell">{shortDayLabel(row.session_date)}</td>
        <td className="px-3 sm:px-4 py-3 font-medium text-ink-900 align-top">
          {row.student_name}
          <span className="sm:hidden block text-xs font-normal text-ink-500">{shortDayLabel(row.session_date)}</span>
        </td>
        <td className="px-4 py-3 text-ink-700 align-top whitespace-nowrap hidden sm:table-cell">{row.teacher_name}</td>
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
                <TimeSelect
                  name="rescheduled_to_time"
                  defaultValue={row.rescheduled_to_time || ""}
                  aria-label="Giờ đã chốt"
                  className={`${field} w-auto py-1.5`}
                  emptyLabel="Giờ"
                />
              </>
            )}
            {status === "student_absent" && (
              <label className="flex items-center gap-1.5 text-sm text-ink-700 whitespace-nowrap rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                <input
                  type="checkbox"
                  name="counts_as_used"
                  defaultChecked={!!row.counts_as_used}
                  className="w-4 h-4 rounded border-amber-300 accent-[var(--color-amber-500)]"
                />
                Không báo trước — tính tiết
              </label>
            )}
            <input
              name="lesson_content"
              defaultValue={row.lesson_content || ""}
              placeholder="Nội dung bài học"
              className={`${field} flex-1 min-w-[160px] py-1.5`}
            />
            <SessionNumberField
              idPrefix={`adm-${row.id}`}
              compact
              defaultTrial={!!row.is_trial}
              defaultNumber={sessionNumber ?? ""}
            />
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
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                if (
                  !confirm(
                    `Xoá hẳn buổi điểm danh ngày ${row.session_date.split("-").reverse().join("/")} của ${row.student_name}? Dùng khi buổi này bị điểm danh trùng — tiền công và số tiết của khách sẽ trừ đi buổi này.`
                  )
                )
                  return;
                startDelete(async () => {
                  const res = await deleteAttendanceAction(row.id);
                  if (res.error) alert(res.error);
                });
              }}
              className={`${btn.danger} py-1.5 ml-auto`}
            >
              {deleting ? "Đang xoá..." : "Xoá buổi trùng"}
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
      <td className="px-4 py-3 tabular whitespace-nowrap text-ink-700 hidden sm:table-cell">
        {shortDayLabel(row.session_date)}
        {row.check_in_time && (
          <span className="block text-xs text-ink-400">{row.check_in_time}</span>
        )}
      </td>
      <td className="px-3 sm:px-4 py-3 min-w-0">
        <span className="flex items-center gap-2 font-medium text-ink-900">
          <span className="hidden sm:inline-flex">
            <Avatar name={row.student_name} className="w-7 h-7 text-[10px]" />
          </span>
          {row.student_name}
        </span>
        {/* Điện thoại: các cột phụ gom vào dưới tên, khỏi kéo ngang. */}
        <span className="sm:hidden block text-xs text-ink-500 tabular mt-0.5">
          {shortDayLabel(row.session_date)}
          {row.check_in_time ? ` · ${row.check_in_time}` : ""} · {row.teacher_name}
        </span>
        {missingFb && (
          <span className="sm:hidden inline-block mt-1">
            <StatusChip tone="amber">Chưa gửi Messenger</StatusChip>
          </span>
        )}
        {row.lesson_content && (
          <span className="sm:hidden block text-xs text-ink-600 mt-0.5 line-clamp-2">{row.lesson_content}</span>
        )}
      </td>
      <td className="px-4 py-3 text-ink-700 max-w-[130px] hidden sm:table-cell">{row.teacher_name}</td>
      <td className="px-4 py-3">
        <AttendanceStatusCell row={row} sessionNumber={sessionNumber} />
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        {row.fb_checkin_confirmed ? (
          <StatusChip tone="mint">Đã gửi</StatusChip>
        ) : missingFb ? (
          <StatusChip tone="amber">Chưa gửi</StatusChip>
        ) : (
          <span className="text-ink-400">–</span>
        )}
      </td>
      <td className="px-4 py-3 text-ink-600 max-w-[220px] hidden sm:table-cell">
        <span className="block truncate" title={row.lesson_content || undefined}>
          {row.lesson_content || "–"}
        </span>
      </td>
      <td className="px-4 py-3 text-ink-500 max-w-[160px] hidden sm:table-cell">
        <span className="block truncate" title={row.note || undefined}>
          {row.note || "–"}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
        {row.status === "completed" ? (
          <RatingLinkButton token={row.rating_token} stars={row.rating_stars} />
        ) : (
          <span className="text-ink-300">–</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`${inlineAction} text-wood-600 hover:text-wood-700 font-semibold`}
        >
          Sửa
        </button>
      </td>
    </tr>
  );
}
