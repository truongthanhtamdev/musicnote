"use client";

import { useActionState, useState } from "react";
import { markAttendanceAction } from "@/actions/attendance";
import type { FormState } from "@/actions/teachers";
import {
  ATTENDANCE_STATUS_LABELS,
  hasRescheduleInfo,
  type AttendanceRow,
  type AttendanceStatus,
} from "@/lib/types";

const initialState: FormState = {};

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  completed: "peer-checked:bg-emerald-600 peer-checked:border-emerald-600",
  teacher_absent: "peer-checked:bg-red-600 peer-checked:border-red-600",
  student_absent: "peer-checked:bg-amber-500 peer-checked:border-amber-500",
  rescheduled: "peer-checked:bg-slate-600 peer-checked:border-slate-600",
};

export default function AttendanceForm({
  classId,
  sessionDate,
  existing,
  onSuccess,
}: {
  classId: number;
  sessionDate: string;
  existing?: AttendanceRow;
  /** Called once after a save succeeds, e.g. to collapse an inline edit view. */
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(markAttendanceAction, initialState);
  const defaultStatus = existing?.status || "completed";
  const [status, setStatus] = useState<AttendanceStatus>(defaultStatus);

  // Adjusting state during render (rather than in an effect) avoids an
  // extra commit-then-rerender pass.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) onSuccess?.();
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="session_date" value={sessionDate} />

      <div>
        <p className="text-sm font-medium text-slate-700 mb-1.5">Kết quả buổi học</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(ATTENDANCE_STATUS_LABELS) as [AttendanceStatus, string][]).map(
            ([value, label]) => (
              <label key={value} className="block">
                <input
                  type="radio"
                  name="status"
                  value={value}
                  defaultChecked={defaultStatus === value}
                  onChange={() => setStatus(value)}
                  className="peer sr-only"
                />
                <span
                  className={`block text-center border border-slate-300 rounded-lg py-2.5 text-sm font-medium text-slate-600 peer-checked:text-white transition cursor-pointer ${STATUS_STYLE[value]}`}
                >
                  {label}
                </span>
              </label>
            )
          )}
        </div>
        {hasRescheduleInfo(status) && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Ngày học bù đã chốt</label>
              <input
                name="rescheduled_to_date"
                type="date"
                defaultValue={existing?.rescheduled_to_date || ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Giờ đã chốt</label>
              <input
                name="rescheduled_to_time"
                type="time"
                defaultValue={existing?.rescheduled_to_time || ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
              />
            </div>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700 py-1">
        <input
          type="checkbox"
          name="fb_checkin_confirmed"
          defaultChecked={!!existing?.fb_checkin_confirmed}
          className="w-4 h-4 rounded border-slate-300"
        />
        Đã điểm danh trên nhóm Facebook
      </label>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Nội dung bài học hôm nay
        </label>
        <textarea
          name="lesson_content"
          defaultValue={existing?.lesson_content || ""}
          placeholder="VD: Ôn hợp âm Am, Dm · Học bài mới: Chương 3"
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
        />
      </div>

      <input
        name="note"
        defaultValue={existing?.note || ""}
        placeholder="Ghi chú (không bắt buộc)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
      />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Đã lưu điểm danh ✓</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-gold-600 hover:bg-gold-700 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-3 text-base"
      >
        {pending ? "Đang lưu..." : existing ? "Cập nhật điểm danh" : "Điểm danh buổi này"}
      </button>
    </form>
  );
}
