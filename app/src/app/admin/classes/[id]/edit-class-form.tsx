"use client";

import { useActionState, useState } from "react";
import { updateClassAction } from "@/actions/classes";
import type { FormState } from "@/actions/teachers";
import {
  DAY_LABELS,
  DAY_ORDER,
  SUBJECT_SUGGESTIONS,
  LANGUAGE_LABELS,
  SCHEDULE_TYPE_LABELS,
  type ClassRow,
  type ClassScheduleType,
} from "@/lib/types";

const initialState: FormState = {};

export default function EditClassForm({ cls }: { cls: ClassRow }) {
  const [state, formAction, pending] = useActionState(updateClassAction, initialState);
  const [scheduleType, setScheduleType] = useState<ClassScheduleType>(cls.schedule_type);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={cls.id} />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="student_name"
          defaultValue={cls.student_name}
          required
          placeholder="Tên học sinh"
          className="rounded-xl border border-navy-200 px-3 py-2 text-sm col-span-2"
        />
        <input
          name="student_phone"
          defaultValue={cls.student_phone || ""}
          placeholder="SĐT học sinh/PH"
          className="rounded-xl border border-navy-200 px-3 py-2 text-sm"
        />
        <input
          name="guardian_name"
          defaultValue={cls.guardian_name || ""}
          placeholder="Tên phụ huynh (nếu HS là trẻ em)"
          className="rounded-xl border border-navy-200 px-3 py-2 text-sm"
        />
        <input
          name="level"
          defaultValue={cls.level || ""}
          placeholder="Trình độ"
          className="rounded-xl border border-navy-200 px-3 py-2 text-sm"
        />
        <input
          name="subject"
          list="subject-suggestions"
          defaultValue={cls.subject}
          placeholder="Môn học"
          className="rounded-xl border border-navy-200 px-3 py-2 text-sm"
        />
        <datalist id="subject-suggestions">
          {SUBJECT_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <select
          name="language"
          defaultValue={cls.language}
          className="rounded-xl border border-navy-200 px-3 py-2 text-sm"
        >
          {Object.entries(LANGUAGE_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <div className="col-span-2">
          <label className="block text-xs text-ink-500 mb-1">Lịch học</label>
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
            <select
              name="day_of_week"
              defaultValue={cls.day_of_week}
              className="rounded-xl border border-navy-200 px-3 py-2 text-sm"
            >
              {DAY_ORDER.map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS[d]}
                </option>
              ))}
            </select>
            <input
              name="start_time"
              type="time"
              defaultValue={cls.start_time}
              required
              className="rounded-xl border border-navy-200 px-3 py-2 text-sm"
            />
          </>
        )}
        <select
          name="duration_minutes"
          defaultValue={String(cls.duration_minutes)}
          className="rounded-xl border border-navy-200 px-3 py-2 text-sm col-span-2"
        >
          <option value="30">30 phút</option>
          <option value="45">45 phút</option>
          <option value="60">60 phút</option>
          <option value="90">90 phút</option>
        </select>
        <input
          name="notes"
          defaultValue={cls.notes || ""}
          placeholder="Ghi chú"
          className="rounded-xl border border-navy-200 px-3 py-2 text-sm col-span-2"
        />
      </div>
      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
      {state.success && <p className="text-sm text-mint-600">Đã lưu thay đổi.</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-wood-500 hover:bg-wood-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        {pending ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  );
}
