"use client";

import { useActionState, useState } from "react";
import { addWeeklySlotAction, removeWeeklySlotAction } from "@/actions/classes";
import type { FormState } from "@/actions/teachers";
import {
  DAY_LABELS,
  DAY_ORDER,
  DURATION_OPTIONS,
  formatClassSchedule,
  type ClassRow,
} from "@/lib/types";
import { TimeSelect } from "@/components/time-select";
import { IconPlus, IconX } from "@/components/icons";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

export interface WeeklySlot {
  id: number;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  schedule_type: ClassRow["schedule_type"];
}

/**
 * Lịch tuần của một lớp: học viên học 2-3 buổi/tuần thì mỗi buổi là một dòng
 * riêng dùng chung gói học, nên ở đây thêm/bớt được từng buổi mà tiến độ gói
 * và học phí vẫn gộp chung.
 */
export default function WeeklySlots({
  classId,
  slots,
  maxSlots = 3,
}: {
  /** Buổi đang mở trang — không cho xoá chính nó để lớp luôn còn ít nhất 1 buổi. */
  classId: number;
  slots: WeeklySlot[];
  maxSlots?: number;
}) {
  const [state, formAction, pending] = useActionState(addWeeklySlotAction, initialState);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setAdding(false);
  }

  const full = slots.length >= maxSlots;

  async function remove(slotId: number) {
    setError(null);
    try {
      await removeWeeklySlotAction(slotId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xoá được buổi này");
    }
  }

  return (
    <div className="p-5 space-y-3">
      <ul className="space-y-2">
        {slots.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-navy-100 bg-ivory-50 px-3.5 py-2.5"
          >
            <span className="text-sm font-medium text-ink-900 tabular">
              {formatClassSchedule(s)}
            </span>
            {s.id === classId ? (
              <span className="text-xs text-ink-400">Buổi đang xem</span>
            ) : (
              <button
                type="button"
                onClick={() => remove(s.id)}
                aria-label={`Bỏ buổi ${formatClassSchedule(s)}`}
                className="p-1.5 -mr-1 rounded-lg text-ink-400 hover:text-coral-600 hover:bg-coral-50 transition"
              >
                <IconX className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-coral-600">{error}</p>}

      {adding ? (
        <form
          action={formAction}
          aria-label="Thêm buổi trong tuần"
          className="rounded-xl border border-navy-100 p-3 space-y-3"
        >
          <input type="hidden" name="class_id" value={classId} />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={label} htmlFor="slot-day">
                Ngày
              </label>
              <select id="slot-day" name="day_of_week" defaultValue="1" className={`${field} py-2`}>
                {DAY_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="slot-start">
                Giờ học
              </label>
              <TimeSelect
                id="slot-start"
                name="start_time"
                required
                className={`${field} py-2`}
                emptyLabel="Giờ học"
              />
            </div>
            <div>
              <label className={label} htmlFor="slot-duration">
                Thời lượng
              </label>
              <select
                id="slot-duration"
                name="duration_minutes"
                defaultValue="60"
                className={`${field} py-2`}
              >
                {DURATION_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} phút
                  </option>
                ))}
              </select>
            </div>
          </div>

          {state.error && <p className="text-sm text-coral-600">{state.error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={`${btn.primary} py-2`}>
              {pending ? "Đang thêm..." : "Thêm buổi"}
            </button>
            <button type="button" onClick={() => setAdding(false)} className={btn.ghost}>
              Huỷ
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={full}
          title={full ? `Tối đa ${maxSlots} buổi/tuần` : undefined}
          className={`${btn.secondary} py-2 disabled:opacity-50`}
        >
          <IconPlus className="w-4 h-4" />
          Thêm buổi trong tuần
        </button>
      )}

      <p className="text-xs text-ink-400">
        Các buổi trong tuần dùng chung một gói học, nên tiến độ tiết và học phí tính gộp. Tối đa{" "}
        {maxSlots} buổi/tuần.
      </p>
    </div>
  );
}
