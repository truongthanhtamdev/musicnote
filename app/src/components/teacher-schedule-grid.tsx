"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { createClassAction } from "@/actions/classes";
import { toggleBusySlotAction, clearDayBusyAction } from "@/actions/availability";
import type { FormState } from "@/actions/teachers";
import {
  DAY_LABELS,
  DAY_ORDER,
  TIME_SLOTS,
  DURATION_OPTIONS,
  SUBJECT_SUGGESTIONS,
  PACKAGE_OPTIONS,
  type ClassRow,
  type BusySlotRow,
} from "@/lib/types";
import { IconAlert, IconPlus, SubjectIcon } from "./icons";
import { btn, field } from "./ui";

const SLOT_MINUTES = 30;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

type Cell =
  | { type: "free" }
  | { type: "busy" }
  | { type: "continuation" }
  | { type: "start"; cls: ClassRow; span: number };

/**
 * Lays classes and busy marks onto the 30-min grid: each class occupies the
 * slot its start_time falls into, spanning ceil(duration/30) rows via
 * rowSpan. A class always wins over a busy mark on the same slot (shouldn't
 * normally overlap, but the class is the more specific fact). Anything left
 * over defaults to free.
 */
function buildGrid(classes: ClassRow[], busySlots: BusySlotRow[]): Record<number, Cell[]> {
  const gridStartMinutes = toMinutes(TIME_SLOTS[0]);
  const busyKeys = new Set(busySlots.map((s) => `${s.day_of_week}-${s.start_time}`));
  const grid: Record<number, Cell[]> = {};
  for (const d of DAY_ORDER) {
    grid[d] = TIME_SLOTS.map((time) =>
      busyKeys.has(`${d}-${time}`) ? { type: "busy" } : { type: "free" }
    );
  }

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
        className="group w-full h-9 sm:h-7 rounded-md hover:bg-wood-50 border border-transparent hover:border-wood-200 transition flex items-center justify-center"
        aria-label={`Thêm lớp ${DAY_LABELS[dayOfWeek]} ${startTime}`}
      >
        <IconPlus className="w-3.5 h-3.5 text-wood-500 opacity-0 group-hover:opacity-100 transition" />
      </button>
    );
  }

  return (
    <div className="absolute z-20 bg-white border border-wood-300 rounded-2xl shadow-xl p-4 w-64 -translate-y-1 text-left">
      <p className="text-xs font-semibold text-ink-700 mb-2.5">
        Thêm lớp · {DAY_LABELS[dayOfWeek]} {startTime}
      </p>
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="teacher_id" value={teacherId} />
        <input type="hidden" name="schedule_type" value="fixed" />
        <input type="hidden" name="slot_day" value={dayOfWeek} />
        <input type="hidden" name="slot_time" value={startTime} />
        <input
          name="student_name"
          required
          placeholder="Tên học viên"
          aria-label="Tên học viên"
          className={`${field} py-2`}
        />
        <input
          name="subject"
          list="grid-subject-suggestions"
          defaultValue="Guitar"
          placeholder="Bộ môn"
          aria-label="Bộ môn"
          className={`${field} py-2`}
        />
        <datalist id="grid-subject-suggestions">
          {SUBJECT_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <select
          name="slot_duration"
          defaultValue="60"
          aria-label="Thời lượng"
          className={`${field} py-2`}
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
          aria-label="Gói học"
          className={`${field} py-2`}
        >
          <option value="">Không theo gói</option>
          {PACKAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              Gói {n} tiết
            </option>
          ))}
        </select>
        {state.error && (
          <p className="text-xs text-coral-700 flex items-center gap-1.5">
            <IconAlert className="w-3.5 h-3.5 shrink-0" />
            {state.error}
          </p>
        )}
        <div className="flex gap-2 pt-0.5">
          <button
            type="submit"
            disabled={pending}
            className={`${btn.primary} px-3 py-1.5 text-xs flex-1`}
          >
            {pending ? "Đang lưu..." : "Thêm lớp"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={`${btn.ghost} px-2 py-1.5 text-xs`}
          >
            Huỷ
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * One merged day×time grid per teacher: a class occupies its slot (wood,
 * clickable in admin mode), a slot the teacher marked busy shows grey, and
 * everything else is free. In "admin" mode, clicking a free cell quick-adds
 * a class there; in "self" mode (the teacher viewing their own schedule),
 * clicking a free cell marks it busy and clicking a busy cell clears it.
 */
export function TeacherScheduleGrid({
  teacherId,
  classes,
  busySlots,
  mode,
}: {
  teacherId: number;
  classes: ClassRow[];
  busySlots: BusySlotRow[];
  mode: "admin" | "self";
}) {
  const [isPending, startTransition] = useTransition();
  const grid = buildGrid(
    classes.filter((c) => c.status === "active"),
    busySlots
  );
  const flexibleClasses = classes.filter(
    (c) => c.status === "active" && c.schedule_type === "flexible"
  );

  return (
    <div>
      {/* Chú giải */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-500 mb-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3.5 h-3.5 rounded bg-wood-100 border border-wood-300" />
          Lớp học
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3.5 h-3.5 rounded bg-ivory-200 border border-navy-100" />
          Bận (cá nhân)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3.5 h-3.5 rounded bg-white border border-navy-100" />
          Rảnh — {mode === "self" ? "bấm để đánh dấu bận" : "bấm để thêm lớp mới"}
        </span>
      </div>

      <div className="overflow-x-auto scroll-thin rounded-2xl border border-navy-100">
        <table className="border-collapse text-[11px] sm:text-xs w-full min-w-0 sm:min-w-[640px]">
          <thead>
            <tr className="bg-ivory-100">
              <th className="w-10 sm:w-16 sticky left-0 bg-ivory-100 z-10" />
              {DAY_ORDER.map((d) => (
                <th key={d} className="px-1 py-2 font-semibold text-ink-700 border-l border-navy-100">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{DAY_LABELS[d]}</span>
                    {mode === "self" && (
                      <button
                        type="button"
                        onClick={() => startTransition(() => clearDayBusyAction(d))}
                        className="text-[10px] font-medium text-ink-400 hover:text-coral-600 transition"
                        title="Bỏ hết đánh dấu bận trong ngày này"
                      >
                        <span className="sm:hidden">xoá</span>
                        <span className="hidden sm:inline">rảnh cả ngày</span>
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time, rowIdx) => {
              const isHour = time.endsWith(":00");
              return (
                <tr key={time} className={isHour ? "border-t border-navy-100" : ""}>
                  <td
                    className={`pr-1 sm:pr-2 text-right sticky left-0 bg-white tabular ${
                      isHour ? "text-ink-600 font-medium" : "text-ink-400"
                    }`}
                  >
                    {isHour ? time : ""}
                  </td>
                  {DAY_ORDER.map((d) => {
                    const cell = grid[d][rowIdx];
                    if (cell.type === "continuation") return null;

                    if (cell.type === "start") {
                      const content = (
                        <>
                          <span className="flex items-center gap-1 font-semibold truncate">
                            <SubjectIcon
                              subject={cell.cls.subject}
                              className="w-3 h-3 shrink-0 text-wood-600"
                            />
                            <span className="truncate">{cell.cls.student_name}</span>
                          </span>
                          <span className="block text-[10px] text-wood-700 truncate">
                            {cell.cls.subject}
                          </span>
                        </>
                      );
                      return (
                        <td
                          key={d}
                          rowSpan={cell.span}
                          className="p-0.5 align-top border-l border-navy-100"
                        >
                          {mode === "admin" ? (
                            <Link
                              href={`/admin/classes/${cell.cls.id}`}
                              className="block h-full rounded-md bg-wood-100 hover:bg-wood-200 border border-wood-300 px-1.5 py-1 text-wood-900 leading-tight transition"
                            >
                              {content}
                            </Link>
                          ) : (
                            <div className="block h-full rounded-md bg-wood-100 border border-wood-300 px-1.5 py-1 text-wood-900 leading-tight">
                              {content}
                            </div>
                          )}
                        </td>
                      );
                    }

                    if (cell.type === "busy") {
                      return (
                        <td key={d} className="p-0.5 border-l border-navy-100">
                          {mode === "self" ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => startTransition(() => toggleBusySlotAction(d, time))}
                              className="w-full h-9 sm:h-7 rounded-md bg-ivory-200 hover:bg-navy-100 border border-navy-100 text-ink-500 text-[10px] font-medium transition disabled:opacity-60"
                              title="Bấm để bỏ đánh dấu bận"
                            >
                              Bận
                            </button>
                          ) : (
                            <div className="w-full h-9 sm:h-7 rounded-md bg-ivory-200 border border-navy-100 text-ink-400 text-[10px] font-medium flex items-center justify-center">
                              Bận
                            </div>
                          )}
                        </td>
                      );
                    }

                    return (
                      <td key={d} className="p-0.5 relative border-l border-navy-100">
                        {mode === "admin" ? (
                          <QuickAddCell teacherId={teacherId} dayOfWeek={d} startTime={time} />
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => startTransition(() => toggleBusySlotAction(d, time))}
                            className="w-full h-9 sm:h-7 rounded-md border border-transparent hover:bg-ivory-100 hover:border-navy-100 transition disabled:opacity-60"
                            aria-label={`Đánh dấu bận ${DAY_LABELS[d]} ${time}`}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {flexibleClasses.length > 0 && (
        <p className="text-xs text-ink-500 mt-3">
          <span className="font-medium text-ink-700">
            {flexibleClasses.length} lớp linh động
          </span>{" "}
          (không có lịch cố định): {flexibleClasses.map((c) => c.student_name).join(", ")}
        </p>
      )}
    </div>
  );
}
