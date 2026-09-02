"use client";

import { useActionState, useState } from "react";
import { markAttendanceAction } from "@/actions/attendance";
import type { FormState } from "@/actions/teachers";
import { ATTENDANCE_STATUS_LABELS, hasRescheduleInfo, type AttendanceStatus } from "@/lib/types";
import { todayISO } from "@/lib/format";

const initialState: FormState = {};

export default function MakeupAttendanceForm({
  classes,
}: {
  classes: { id: number; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(markAttendanceAction, initialState);
  const [status, setStatus] = useState<AttendanceStatus>("completed");

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
        Dùng khi buổi học bị dời qua ngày khác với lịch cố định hàng tuần, để điểm danh từng
        buổi của lớp Linh động (không có lịch cố định), hoặc để bổ sung/sửa điểm danh cho lớp
        cũ đã tạm dừng/kết thúc — chọn đúng lớp và ngày dạy thực tế, buổi này vẫn tính vào gói
        học của học viên.
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
          <label className="block text-xs text-slate-500 mb-1">
            Buổi thứ mấy (không bắt buộc) — điền nếu lớp cũ đã học sẵn nhiều buổi, hệ thống sẽ
            lấy số này làm mốc rồi tự đếm tiếp. Điền 0 nếu là buổi học thử.
          </label>
          <input
            name="session_number"
            type="number"
            min={0}
            placeholder="VD: 15"
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                    onChange={() => setStatus(value)}
                    className="peer sr-only"
                  />
                  <span className="block text-center border border-slate-300 rounded-lg py-2 text-sm font-medium text-slate-600 peer-checked:bg-gold-600 peer-checked:border-gold-600 peer-checked:text-white transition cursor-pointer">
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Giờ đã chốt</label>
                <input
                  name="rescheduled_to_time"
                  type="time"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 py-1">
          <input type="checkbox" name="fb_checkin_confirmed" className="w-4 h-4 rounded border-slate-300" />
          Đã điểm danh trên nhóm Facebook
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
          className="w-full bg-gold-600 hover:bg-gold-700 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-2.5 text-sm"
        >
          {pending ? "Đang lưu..." : "Lưu điểm danh bù"}
        </button>
      </form>
    </div>
  );
}
