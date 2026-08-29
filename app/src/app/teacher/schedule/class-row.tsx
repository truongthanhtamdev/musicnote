"use client";

import { useActionState, useState } from "react";
import { updateClassAction } from "@/actions/classes";
import type { FormState } from "@/actions/teachers";
import { formatTimeRange } from "@/lib/format";
import { DAY_LABELS, DAY_ORDER, type ClassRow } from "@/lib/types";

const initialState: FormState = {};

export default function TeacherClassRow({ cls }: { cls: ClassRow }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateClassAction, initialState);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setEditing(false);
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-3 py-2">
        <span className="text-slate-800">{cls.student_name}</span>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-sm">
            {formatTimeRange(cls.start_time, cls.duration_minutes)}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-indigo-600 hover:underline text-sm"
          >
            Sửa
          </button>
        </div>
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
            name="level"
            defaultValue={cls.level || ""}
            placeholder="Trình độ"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
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
            className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg px-3 py-1.5"
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
        </div>
      </form>
    </li>
  );
}
