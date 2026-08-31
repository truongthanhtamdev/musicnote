"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createClassAction } from "@/actions/classes";
import type { FormState } from "@/actions/teachers";
import {
  DAY_LABELS,
  DAY_ORDER,
  SUBJECT_SUGGESTIONS,
  LANGUAGE_LABELS,
  PACKAGE_OPTIONS,
  SCHEDULE_TYPE_LABELS,
  type ClassScheduleType,
  type UserRow,
} from "@/lib/types";

const initialState: FormState = {};

export default function NewClassForm({ teachers }: { teachers: UserRow[] }) {
  const [state, formAction, pending] = useActionState(createClassAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [scheduleType, setScheduleType] = useState<ClassScheduleType>("fixed");

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setScheduleType("fixed");
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          name="student_name"
          required
          placeholder="Tên học sinh"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm col-span-2"
        />
        <input
          name="student_phone"
          placeholder="SĐT học sinh/PH"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="guardian_name"
          placeholder="Tên phụ huynh (nếu HS là trẻ em)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="level"
          placeholder="Trình độ (VD: Cơ bản)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="subject"
          list="subject-suggestions"
          placeholder="Môn học (VD: Guitar)"
          defaultValue="Guitar"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <datalist id="subject-suggestions">
          {SUBJECT_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <select name="language" defaultValue="vi" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {Object.entries(LANGUAGE_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Lịch học</label>
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
              required
              defaultValue=""
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Thứ học
              </option>
              {DAY_ORDER.map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS[d]}
                </option>
              ))}
            </select>
            <input
              name="start_time"
              type="time"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </>
        )}
        <select
          name="duration_minutes"
          defaultValue="60"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="30">30 phút</option>
          <option value="45">45 phút</option>
          <option value="60">60 phút</option>
          <option value="90">90 phút</option>
        </select>
        <select
          name="teacher_id"
          defaultValue=""
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Chưa xếp giáo viên</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          name="package_total_sessions"
          defaultValue=""
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Không theo gói (học đều đặn)</option>
          {PACKAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              Gói {n} tiết
            </option>
          ))}
        </select>
        <input
          name="notes"
          placeholder="Ghi chú"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Đã thêm lớp học.</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-gold-600 hover:bg-gold-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        {pending ? "Đang lưu..." : "Thêm lớp"}
      </button>
    </form>
  );
}
