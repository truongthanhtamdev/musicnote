"use client";

import { useActionState, useState } from "react";
import { markAttendanceAction } from "@/actions/attendance";
import type { FormState } from "@/actions/teachers";
import { ATTENDANCE_STATUS_LABELS, type AttendanceStatus } from "@/lib/types";
import { todayISO } from "@/lib/format";

const initialState: FormState = {};

export default function MakeupAttendanceForm({
  classes,
}: {
  classes: { id: number; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(markAttendanceAction, initialState);

  // Closing the panel unmounts the form, so there's nothing to reset —
  // adjusting state during render (rather than in an effect) avoids an
  // extra commit-then-rerender pass.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2"
      >
        + Điểm danh buổi học bù / dời lịch
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-900">Điểm danh buổi học bù</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">
          Đóng
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-3">
        Dùng khi buổi học bị dời qua ngày khác với lịch cố định hàng tuần — chọn đúng lớp và
        ngày dạy bù thực tế, buổi này vẫn tính vào gói học của học viên.
      </p>
      <form action={formAction} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <select
            name="class_id"
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">-- Chọn lớp --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="session_date"
            required
            defaultValue={todayISO()}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

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
                    defaultChecked={value === "completed"}
                    className="peer sr-only"
                  />
                  <span className="block text-center border border-slate-300 rounded-lg py-2 text-sm font-medium text-slate-600 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 peer-checked:text-white transition cursor-pointer">
                    {label}
                  </span>
                </label>
              )
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 py-1">
          <input type="checkbox" name="fb_checkin_confirmed" className="w-4 h-4 rounded border-slate-300" />
          Đã điểm danh trên nhóm Facebook
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 py-1">
          <input type="checkbox" name="is_trial" className="w-4 h-4 rounded border-slate-300" />
          Buổi học thử (tính lương 50.000đ/tiết)
        </label>

        <textarea
          name="lesson_content"
          placeholder="Nội dung bài học hôm nay"
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="note"
          placeholder="Ghi chú (không bắt buộc)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-2.5 text-sm"
        >
          {pending ? "Đang lưu..." : "Lưu điểm danh bù"}
        </button>
      </form>
    </div>
  );
}
