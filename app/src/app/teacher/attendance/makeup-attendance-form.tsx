"use client";

import { useActionState, useState } from "react";
import { markAttendanceAction } from "@/actions/attendance";
import type { FormState } from "@/actions/teachers";
import {
  ATTENDANCE_STATUS_LABELS,
  TRIAL_SESSION_RATE,
  hasRescheduleInfo,
  type AttendanceStatus,
} from "@/lib/types";
import { formatVND, todayISO } from "@/lib/format";
import { Modal } from "@/components/modal";
import { IconAlert, IconPlus } from "@/components/icons";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  completed: "peer-checked:bg-mint-500 peer-checked:border-mint-500 peer-checked:text-white",
  teacher_absent: "peer-checked:bg-coral-500 peer-checked:border-coral-500 peer-checked:text-white",
  student_absent: "peer-checked:bg-amber-500 peer-checked:border-amber-500 peer-checked:text-white",
  rescheduled: "peer-checked:bg-navy-700 peer-checked:border-navy-700 peer-checked:text-white",
};

export default function MakeupAttendanceForm({
  classes,
}: {
  classes: { id: number; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(markAttendanceAction, initialState);
  const [status, setStatus] = useState<AttendanceStatus>("completed");

  // Closing the modal unmounts the form, so there's nothing to reset —
  // adjusting state during render (rather than in an effect) avoids an
  // extra commit-then-rerender pass.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btn.secondary}>
        <IconPlus className="w-4 h-4" />
        Điểm danh buổi học bù
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Điểm danh buổi học bù / dời lịch"
        subtitle="Dùng khi buổi học dời sang ngày khác, khi điểm danh lớp linh động, hoặc khi bổ sung cho lớp đã tạm dừng. Buổi này vẫn tính vào gói học của học viên."
      >
        <form action={formAction} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="m-class">
                Lớp học
              </label>
              <select id="m-class" name="class_id" required className={field}>
                <option value="">-- Chọn lớp --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="m-date">
                Ngày dạy thực tế
              </label>
              <input
                id="m-date"
                type="date"
                name="session_date"
                required
                defaultValue={todayISO()}
                className={field}
              />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="m-session">
              Buổi thứ mấy
              <span className="font-normal text-ink-400"> — không bắt buộc</span>
            </label>
            <input
              id="m-session"
              name="session_number"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder="VD: 15"
              className={`${field} sm:w-40 tabular`}
            />
            <p className="text-xs text-ink-400 mt-1.5">
              Điền nếu lớp cũ đã học sẵn nhiều buổi — hệ thống lấy số này làm mốc rồi tự đếm tiếp.
              Điền 0 nếu là buổi học thử (tính {formatVND(TRIAL_SESSION_RATE)}/tiết).
            </p>
          </div>

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
                      defaultChecked={value === "completed"}
                      onChange={() => setStatus(value)}
                      className="peer sr-only"
                    />
                    <span
                      className={`block text-center border border-navy-200 rounded-xl py-2.5 text-sm font-semibold text-ink-700 transition cursor-pointer hover:border-navy-300 ${STATUS_STYLE[value]}`}
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
                  <label className={label} htmlFor="m-resched-date">
                    Ngày học bù đã chốt
                  </label>
                  <input
                    id="m-resched-date"
                    name="rescheduled_to_date"
                    type="date"
                    className={field}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="m-resched-time">
                    Giờ đã chốt
                  </label>
                  <input
                    id="m-resched-time"
                    name="rescheduled_to_time"
                    type="time"
                    className={field}
                  />
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-ivory-50 px-3.5 py-3 cursor-pointer">
            <input
              type="checkbox"
              name="fb_checkin_confirmed"
              className="w-4.5 h-4.5 rounded border-navy-300 accent-[var(--color-mint-500)]"
            />
            <span className="text-sm text-ink-700">Đã điểm danh trên nhóm Facebook</span>
          </label>

          <div>
            <label className={label} htmlFor="m-lesson">
              Nội dung bài học
            </label>
            <textarea id="m-lesson" name="lesson_content" rows={2} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="m-note">
              Ghi chú
            </label>
            <input id="m-note" name="note" placeholder="Không bắt buộc" className={field} />
          </div>

          {state.error && (
            <p className="text-sm text-coral-700 bg-coral-50 border border-coral-100 rounded-xl px-3 py-2 flex items-center gap-2">
              <IconAlert className="w-4 h-4 shrink-0" />
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className={`${btn.primary} w-full py-3 text-base`}
          >
            {pending ? "Đang lưu..." : "Lưu điểm danh bù"}
          </button>
        </form>
      </Modal>
    </>
  );
}
