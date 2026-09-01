"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { updateClassAction, deleteClassAction } from "@/actions/classes";
import { UsedSessionsEditor } from "@/components/used-sessions-editor";
import type { FormState } from "@/actions/teachers";
import {
  DAY_LABELS,
  DAY_ORDER,
  SUBJECT_SUGGESTIONS,
  LANGUAGE_LABELS,
  SCHEDULE_TYPE_LABELS,
  formatClassSchedule,
  type ClassRow,
  type ClassScheduleType,
} from "@/lib/types";
import type { PackageProgress } from "@/lib/queries";

const initialState: FormState = {};

export default function TeacherClassRow({
  cls,
  progress,
}: {
  cls: ClassRow;
  progress?: PackageProgress | null;
}) {
  const [editing, setEditing] = useState(false);
  const [scheduleType, setScheduleType] = useState<ClassScheduleType>(cls.schedule_type);
  const [state, formAction, pending] = useActionState(updateClassAction, initialState);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setEditing(false);
  }

  if (!editing) {
    return (
      <li className="py-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-800">
            {cls.student_name}
            <span className="text-slate-400 text-xs ml-1.5">
              {cls.subject}
              {cls.language === "en" ? " · EN" : ""}
            </span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-sm">{formatClassSchedule(cls)}</span>
            <Link
              href={`/teacher/attendance?classId=${cls.id}`}
              className="text-gold-600 hover:underline text-sm"
            >
              Lịch sử
            </Link>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-gold-600 hover:underline text-sm"
            >
              Sửa
            </button>
          </div>
        </div>
        {progress && (
          <div
            className={`text-xs mt-0.5 ${progress.remaining <= 3 ? "text-amber-600 font-medium" : "text-slate-500"}`}
          >
            <UsedSessionsEditor progress={progress} size="xs" /> · Còn {progress.remaining}
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="py-3 border-t border-slate-100 first:border-t-0">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="id" value={cls.id} />
        <input
          name="student_name"
          defaultValue={cls.student_name}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Tên học sinh"
        />
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 flex gap-4 text-sm">
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
          {scheduleType === "fixed" && (
            <>
              <select
                name="day_of_week"
                defaultValue={cls.day_of_week}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </>
          )}
          <select
            name="duration_minutes"
            defaultValue={String(cls.duration_minutes)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm col-span-2"
          >
            <option value="30">30 phút</option>
            <option value="45">45 phút</option>
            <option value="60">60 phút</option>
            <option value="90">90 phút</option>
          </select>
          <input
            name="student_phone"
            defaultValue={cls.student_phone || ""}
            placeholder="SĐT"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="guardian_name"
            defaultValue={cls.guardian_name || ""}
            placeholder="Tên phụ huynh"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="level"
            defaultValue={cls.level || ""}
            placeholder="Trình độ"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="subject"
            list="subject-suggestions"
            defaultValue={cls.subject}
            placeholder="Môn học"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <datalist id="subject-suggestions">
            {SUBJECT_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <select
            name="language"
            defaultValue={cls.language}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(LANGUAGE_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <input
            name="notes"
            defaultValue={cls.notes || ""}
            placeholder="Ghi chú"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm col-span-2"
          />
        </div>
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="text-sm bg-gold-600 hover:bg-gold-700 disabled:opacity-60 text-white rounded-lg px-3 py-1.5"
          >
            {pending ? "Đang lưu..." : "Lưu"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Huỷ
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              if (confirm("Xoá lớp học này? Toàn bộ lịch sử điểm danh của lớp sẽ mất.")) {
                startDeleteTransition(() => deleteClassAction(cls.id));
              }
            }}
            className="text-sm text-red-600 hover:underline ml-auto disabled:opacity-60"
          >
            {isDeleting ? "Đang xoá..." : "Xoá lớp"}
          </button>
        </div>
      </form>
    </li>
  );
}
