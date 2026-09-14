"use client";

import { useState } from "react";
import { DAY_LABELS, DAY_ORDER, DURATION_OPTIONS } from "@/lib/types";
import { IconPlus, IconX } from "./icons";
import { field } from "./ui";
import { TimeSelect } from "@/components/time-select";

interface Slot {
  day: string;
  time: string;
  duration: string;
}

const EMPTY_SLOT: Slot = { day: "", time: "", duration: "60" };

/**
 * Repeatable day/time/duration rows for a class that meets more than once a
 * week (e.g. a student studying 2-3 buổi/tuần). Each row posts as a
 * slot_day/slot_time/slot_duration triplet — createClassAction zips them
 * back together by position via FormData.getAll, and creates one `classes`
 * row per slot, all sharing one package.
 */
export function SlotsField() {
  const [slots, setSlots] = useState<Slot[]>([EMPTY_SLOT]);

  function updateSlot(i: number, patch: Partial<Slot>) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  /** Buổi thêm vào lấy sẵn giờ của buổi trước — học viên hầu như học cùng giờ. */
  function addSlot() {
    setSlots((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, { ...EMPTY_SLOT, time: last?.time ?? "", duration: last?.duration ?? "60" }];
    });
  }

  /** Điền đủ 7 ngày trong tuần, giữ nguyên giờ và thời lượng của buổi đầu. */
  function fillWeek() {
    setSlots((prev) => {
      const base = prev[0] ?? EMPTY_SLOT;
      return DAY_ORDER.map((d) => ({ ...base, day: String(d) }));
    });
  }

  const usedDays = new Set(slots.map((s) => s.day).filter(Boolean));

  return (
    <div className="col-span-2 space-y-2">
      {slots.map((slot, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center rounded-xl bg-ivory-50 border border-navy-100 p-2"
        >
          <select
            name="slot_day"
            required
            value={slot.day}
            onChange={(e) => updateSlot(i, { day: e.target.value })}
            aria-label={`Thứ học buổi ${i + 1}`}
            className={`${field} py-2`}
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
          <TimeSelect
            name="slot_time"
            required
            value={slot.time}
            onChange={(e) => updateSlot(i, { time: e.target.value })}
            aria-label={`Giờ bắt đầu buổi ${i + 1}`}
            className={`${field} py-2`}
            emptyLabel="Giờ học"
          />
          <select
            name="slot_duration"
            value={slot.duration}
            onChange={(e) => updateSlot(i, { duration: e.target.value })}
            aria-label={`Thời lượng buổi ${i + 1}`}
            className={`${field} py-2`}
          >
            {DURATION_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} phút
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSlots((prev) => prev.filter((_, idx) => idx !== i))}
            disabled={slots.length === 1}
            className="p-2 rounded-lg text-ink-400 hover:text-coral-600 hover:bg-coral-50 disabled:opacity-0 transition"
            aria-label="Bỏ buổi này"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={addSlot}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-wood-600 hover:text-wood-700"
        >
          <IconPlus className="w-4 h-4" />
          Thêm buổi trong tuần
        </button>
        {slots.length < DAY_ORDER.length && (
          <button
            type="button"
            onClick={fillWeek}
            className="text-sm font-semibold text-ink-500 hover:text-ink-700"
          >
            Học cả tuần (7 ngày)
          </button>
        )}
      </div>
      {usedDays.size < slots.filter((s) => s.day).length && (
        <p className="text-sm text-amber-700">
          Có hai buổi trùng cùng một thứ. Được thôi nếu học viên học hai ca trong ngày, nhưng
          nhớ để hai giờ khác nhau.
        </p>
      )}
    </div>
  );
}
