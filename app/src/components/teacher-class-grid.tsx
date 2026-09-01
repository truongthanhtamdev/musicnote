"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { createClassAction } from "@/actions/classes";
import type { FormState } from "@/actions/teachers";
import {
  DAY_LABELS,
  DAY_ORDER,
  TIME_SLOTS,
  DURATION_OPTIONS,
  SUBJECT_SUGGESTIONS,
  PACKAGE_OPTIONS,
  type ClassRow,
} from "@/lib/types";

const SLOT_MINUTES = 30;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

type Cell =
  | { type: "empty" }
  | { type: "continuation" }
  | { type: "start"; cls: ClassRow; span: number };

/** Lays classes onto the 30-min grid: each class occupies the slot its start_time falls into, spanning ceil(duration/30) rows via rowSpan. */
function buildGrid(classes: ClassRow[]): Record<number, Cell[]> {
  const gridStartMinutes = toMinutes(TIME_SLOTS[0]);
  const grid: Record<number, Cell[]> = {};
  for (const d of DAY_ORDER) grid[d] = TIME_SLOTS.map(() => ({ type: "empty" }));

  for (const cls of classes) {
    if (cls.schedule_type === "flexible" || cls.day_of_week < 0) continue;
    const startIdx = Math.floor((toMinutes(cls.start_time) - gridStartMinutes) / SLOT_MINUTES);
    const span = Math.max(1, Math.ceil(cls.duration_minutes / SLOT_MINUTES));
    if (startIdx < 0 || startIdx >= TIME_SLOTS.length) continue;
    const col = grid[cls.day_of_week];
    if (!col) continue;
    col[startIdx] = { type: "start", cls, span };
    for (let i = 1; i < span && startIdx + i < TIME_SLOTS.length; i++) {
      col[startIdx + i] = { type: "continuation" };
    }
  }
  return grid;
}

const initialState: FormState = {};

function QuickAddCell({
  teacherId,
  dayOfWeek,
  startTime,
}: {
  teacherId: number;
  dayOfWeek: number;
  startTime: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createClassAction, initialState);

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
        className="w-full h-6 rounded hover:bg-gold-50 cursor-pointer"
        aria-label={`Thêm lớp ${DAY_LABELS[dayOfWeek]} ${startTime}`}
      />
    );
  }

  return (
    <div className="absolute z-10 bg-white border border-gold-300 rounded-lg shadow-lg p-3 w-64 -translate-y-1 text-left">
      <p className="text-xs font-medium text-slate-700 mb-2">
        Thêm lớp: {DAY_LABELS[dayOfWeek]} {startTime}
      </p>
      <form action={formAction} className="space-y-1.5">
        <input type="hidden" name="teacher_id" value={teacherId} />
        <input type="hidden" name="schedule_type" value="fixed" />
        <input type="hidden" name="slot_day" value={dayOfWeek} />
        <input type="hidden" name="slot_time" value={startTime} />
        <input
          name="student_name"
          required
          placeholder="Tên học sinh"
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          name="subject"
          list="grid-subject-suggestions"
          defaultValue="Guitar"
          placeholder="Môn học"
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <datalist id="grid-subject-suggestions">
          {SUBJECT_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <select
          name="slot_duration"
          defaultValue="60"
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        >
          {DURATION_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} phút
            </option>
          ))}
        </select>
        <select
          name="package_total_sessions"
          defaultValue=""
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="">Không theo gói</option>
          {PACKAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              Gói {n} tiết
            </option>
          ))}
        </select>
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        <div className="flex gap-1.5 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="text-xs bg-gold-600 hover:bg-gold-700 disabled:opacity-60 text-white rounded px-2 py-1"
          >
            {pending ? "Đang lưu..." : "Thêm"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Huỷ
          </button>
        </div>
      </form>
    </div>
  );
}

export function TeacherClassGrid({ teacherId, classes }: { teacherId: number; classes: ClassRow[] }) {
  const grid = buildGrid(classes.filter((c) => c.status === "active"));
  const flexibleClasses = classes.filter(
    (c) => c.status === "active" && c.schedule_type === "flexible"
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs w-full">
          <thead>
            <tr>
              <th className="w-14 sticky left-0 bg-white"></th>
              {DAY_ORDER.map((d) => (
                <th key={d} className="px-1 py-1 font-medium text-slate-600">
                  {DAY_LABELS[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time, rowIdx) => (
              <tr key={time}>
                <td className="text-slate-500 pr-2 text-right sticky left-0 bg-white">{time}</td>
                {DAY_ORDER.map((d) => {
                  const cell = grid[d][rowIdx];
                  if (cell.type === "continuation") return null;
                  if (cell.type === "start") {
                    return (
                      <td key={d} rowSpan={cell.span} className="p-0.5 align-top">
                        <Link
                          href={`/admin/classes/${cell.cls.id}`}
                          className="block h-full rounded bg-gold-100 hover:bg-gold-200 border border-gold-300 px-1.5 py-1 text-gold-900 leading-tight"
                        >
                          <span className="block font-medium truncate">{cell.cls.student_name}</span>
                          <span className="block text-[10px] text-gold-700 truncate">
                            {cell.cls.subject}
                          </span>
                        </Link>
                      </td>
                    );
                  }
                  return (
                    <td key={d} className="p-0.5 relative">
                      <QuickAddCell teacherId={teacherId} dayOfWeek={d} startTime={time} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {flexibleClasses.length > 0 && (
        <p className="text-xs text-slate-500 mt-2">
          + {flexibleClasses.length} lớp Linh động (không có lịch cố định):{" "}
          {flexibleClasses.map((c) => c.student_name).join(", ")}
        </p>
      )}
    </div>
  );
}
