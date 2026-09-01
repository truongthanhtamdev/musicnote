"use client";

import { useState } from "react";
import { DAY_LABELS, DAY_ORDER, DURATION_OPTIONS } from "@/lib/types";

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

  return (
    <div className="col-span-2 space-y-2">
      {slots.map((slot, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
          <select
            name="slot_day"
            required
            value={slot.day}
            onChange={(e) => updateSlot(i, { day: e.target.value })}
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
            name="slot_time"
            type="time"
            required
            value={slot.time}
            onChange={(e) => updateSlot(i, { time: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            name="slot_duration"
            value={slot.duration}
            onChange={(e) => updateSlot(i, { duration: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
            className="text-slate-400 hover:text-red-600 disabled:opacity-0 px-2"
            aria-label="Bỏ buổi này"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSlots((prev) => [...prev, EMPTY_SLOT])}
        className="text-sm text-gold-700 hover:underline"
      >
        + Thêm buổi/tuần (học viên học nhiều buổi)
      </button>
    </div>
  );
}
