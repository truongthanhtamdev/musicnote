"use client";

import { useActionState } from "react";
import { updateClassAction } from "@/actions/classes";
import type { FormState } from "@/actions/teachers";
import { DAY_LABELS, DAY_ORDER, SUBJECT_SUGGESTIONS, LANGUAGE_LABELS, type ClassRow } from "@/lib/types";

const initialState: FormState = {};

export default function EditClassForm({ cls }: { cls: ClassRow }) {
  const [state, formAction, pending] = useActionState(updateClassAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={cls.id} />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="student_name"
          defaultValue={cls.student_name}
          required
          placeholder="Tên học sinh"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm col-span-2"
        />
        <input
          name="student_phone"
          defaultValue={cls.student_phone || ""}
          placeholder="SĐT học sinh/PH"
          className="input"
        />
        <input
          name="guardian_name"
          defaultValue={cls.guardian_name || ""}
          placeholder="Tên phụ huynh (nếu HS là trẻ em)"
          className="input"
        />
        <input
          name="level"
          defaultValue={cls.level || ""}
          placeholder="Trình độ"
          className="input"
        />
        <input
          name="subject"
          list="subject-suggestions"
          defaultValue={cls.subject}
          placeholder="Môn học"
          className="input"
        />
        <datalist id="subject-suggestions">
          {SUBJECT_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <select
          name="language"
          defaultValue={cls.language}
          className="input"
        >
          {Object.entries(LANGUAGE_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="day_of_week"
          defaultValue={cls.day_of_week}
          className="input"
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
          className="input"
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
          name="notes"
          defaultValue={cls.notes || ""}
          placeholder="Ghi chú"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm col-span-2"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Đã lưu thay đổi.</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary"
      >
        {pending ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  );
}
