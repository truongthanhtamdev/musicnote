"use client";

import { useActionState, useState } from "react";
import { markAttendanceAction } from "@/actions/attendance";
import type { FormState } from "@/actions/teachers";
import {
  ATTENDANCE_STATUS_LABELS,
  TRIAL_SESSION_RATE,
  hasRescheduleInfo,
  type AttendanceRow,
  type AttendanceStatus,
} from "@/lib/types";
import { formatVND } from "@/lib/format";
import { IconAlert, IconCheck } from "@/components/icons";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

/** Mỗi kết quả buổi học có màu + chữ riêng, không dựa vào màu đơn lẻ. */
const STATUS_STYLE: Record<AttendanceStatus, string> = {
  completed: "peer-checked:bg-mint-500 peer-checked:border-mint-500 peer-checked:text-white",
  teacher_absent: "peer-checked:bg-coral-500 peer-checked:border-coral-500 peer-checked:text-white",
  student_absent: "peer-checked:bg-amber-500 peer-checked:border-amber-500 peer-checked:text-white",
  rescheduled: "peer-checked:bg-navy-700 peer-checked:border-navy-700 peer-checked:text-white",
};

export default function AttendanceForm({
  classId,
  sessionDate,
  existing,
  sessionNumber,
  onSuccess,
}: {
  classId: number;
  sessionDate: string;
  existing?: AttendanceRow;
  /** What number this session is by the current count — shown as a hint in the "buổi thứ mấy" box. */
  sessionNumber?: number;
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
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="session_date" value={sessionDate} />

      <div>
        <p className={label}>Kết quả buổi học</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(ATTENDANCE_STATUS_LABELS) as [AttendanceStatus, string][]).map(
            ([value, text]) => (
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
                  className={`block text-center border border-navy-200 rounded-xl py-3 text-sm font-semibold text-ink-700 transition cursor-pointer hover:border-navy-300 ${STATUS_STYLE[value]}`}
                >
                  {text}
                </span>
              </label>
            )
          )}
        </div>

        {hasRescheduleInfo(status) && (
          <div className="grid grid-cols-2 gap-3 mt-3 rounded-2xl border border-navy-100 bg-ivory-50 p-3">
            <div>
              <label className={label} htmlFor={`resched-date-${classId}`}>
                Ngày học bù đã chốt
              </label>
              <input
                id={`resched-date-${classId}`}
                name="rescheduled_to_date"
                type="date"
                defaultValue={existing?.rescheduled_to_date || ""}
                className={field}
              />
            </div>
            <div>
              <label className={label} htmlFor={`resched-time-${classId}`}>
                Giờ đã chốt
              </label>
              <input
                id={`resched-time-${classId}`}
                name="rescheduled_to_time"
                type="time"
                defaultValue={existing?.rescheduled_to_time || ""}
                className={field}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className={label} htmlFor={`session-${classId}`}>
          Buổi thứ mấy
          <span className="font-normal text-ink-400"> — điền 0 nếu là buổi học thử</span>
        </label>
        <input
          id={`session-${classId}`}
          name="session_number"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          defaultValue={sessionNumber ?? ""}
          placeholder="VD: 15"
          className={`${field} tabular`}
        />
        <p className="text-xs text-ink-400 mt-1.5">
          Số tự nhảy theo gói học, bạn vẫn sửa được. Buổi 0 tính lương{" "}
          {formatVND(TRIAL_SESSION_RATE)}/tiết thay vì đơn giá thường.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-navy-100 bg-ivory-50 px-3.5 py-3 cursor-pointer">
        <input
          type="checkbox"
          name="fb_checkin_confirmed"
          defaultChecked={!!existing?.fb_checkin_confirmed}
          className="w-4.5 h-4.5 mt-0.5 rounded border-navy-300 accent-[var(--color-mint-500)]"
        />
        <span className="text-sm text-ink-700">Đã điểm danh trên nhóm Facebook</span>
      </label>

      <div>
        <label className={label} htmlFor={`lesson-${classId}`}>
          Nội dung bài học hôm nay
        </label>
        <textarea
          id={`lesson-${classId}`}
          name="lesson_content"
          defaultValue={existing?.lesson_content || ""}
          placeholder="VD: Ôn hợp âm Am, Dm · Học bài mới: Chương 3"
          rows={2}
          className={field}
        />
      </div>

      <div>
        <label className={label} htmlFor={`note-${classId}`}>
          Ghi chú
        </label>
        <input
          id={`note-${classId}`}
          name="note"
          defaultValue={existing?.note || ""}
          placeholder="Không bắt buộc"
          className={field}
        />
      </div>

      {state.error && (
        <p className="text-sm text-coral-700 bg-coral-50 border border-coral-100 rounded-xl px-3 py-2 flex items-center gap-2">
          <IconAlert className="w-4 h-4 shrink-0" />
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-mint-700 bg-mint-50 border border-mint-100 rounded-xl px-3 py-2 flex items-center gap-2">
          <IconCheck className="w-4 h-4 shrink-0" />
          Đã lưu điểm danh
        </p>
      )}

      <button type="submit" disabled={pending} className={`${btn.primary} w-full py-3 text-base`}>
        {pending ? "Đang lưu..." : existing ? "Cập nhật điểm danh" : "Điểm danh buổi này"}
      </button>
    </form>
  );
}
