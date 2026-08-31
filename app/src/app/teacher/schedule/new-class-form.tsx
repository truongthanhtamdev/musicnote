"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createClassAction } from "@/actions/classes";
import type { FormState } from "@/actions/teachers";
import {
  DAY_LABELS,
  DAY_ORDER,
  SUBJECT_SUGGESTIONS,
  LANGUAGE_LABELS,
  SOURCE_LABELS,
  SCHEDULE_TYPE_LABELS,
  type ClassScheduleType,
} from "@/lib/types";

const initialState: FormState = {};

export default function NewClassForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createClassAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [scheduleType, setScheduleType] = useState<ClassScheduleType>("fixed");

  // Close the panel once a save succeeds. Adjusting state during render
  // (rather than in an effect) avoids an extra commit-then-rerender pass.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
      setScheduleType("fixed");
    }
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-gold-600 hover:bg-gold-700 text-white font-medium rounded-xl px-4 py-3 text-base"
      >
        + Thêm lớp học mới
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-900">Thêm lớp học mới của bạn</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Đóng
        </button>
      </div>
      <form ref={formRef} action={formAction} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nguồn lớp</label>
          <select
            name="source"
            defaultValue="center"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
          >
            {Object.entries(SOURCE_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tên học sinh</label>
          <input
            name="student_name"
            required
            placeholder="VD: Bé Minh Khang"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SĐT học sinh/PH</label>
            <input
              name="student_phone"
              placeholder="Không bắt buộc"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên phụ huynh</label>
            <input
              name="guardian_name"
              placeholder="Nếu HS là trẻ em"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Trình độ</label>
            <input
              name="level"
              placeholder="VD: Cơ bản"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Môn học</label>
            <input
              name="subject"
              list="subject-suggestions"
              defaultValue="Guitar"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
            />
            <datalist id="subject-suggestions">
              {SUBJECT_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ngôn ngữ</label>
            <select
              name="language"
              defaultValue="vi"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
            >
              {Object.entries(LANGUAGE_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Lịch học</label>
            <div className="flex gap-4 text-sm">
              {(Object.entries(SCHEDULE_TYPE_LABELS) as [ClassScheduleType, string][]).map(
                ([v, label]) => (
                  <label key={v} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="schedule_type"
                      value={v}
                      checked={scheduleType === v}
                      onChange={() => setScheduleType(v)}
                    />{" "}
                    {label}
                  </label>
                )
              )}
            </div>
          </div>
          {scheduleType === "fixed" && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Thứ học</label>
                <select
                  name="day_of_week"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
                >
                  <option value="" disabled>
                    Chọn thứ
                  </option>
                  {DAY_ORDER.map((d) => (
                    <option key={d} value={d}>
                      {DAY_LABELS[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Giờ bắt đầu</label>
                <input
                  name="start_time"
                  type="time"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
                />
              </div>
            </>
          )}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Thời lượng</label>
            <select
              name="duration_minutes"
              defaultValue="60"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
            >
              <option value="30">30 phút</option>
              <option value="45">45 phút</option>
              <option value="60">60 phút</option>
              <option value="90">90 phút</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
            <input
              name="notes"
              placeholder="Không bắt buộc"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
            />
          </div>
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-gold-600 hover:bg-gold-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2.5 text-base"
        >
          {pending ? "Đang lưu..." : "Lưu lớp học"}
        </button>
      </form>
    </div>
  );
}
