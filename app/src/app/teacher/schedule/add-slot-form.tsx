"use client";

import { useActionState, useState } from "react";
import { addWeeklySlotAction } from "@/actions/classes";
import type { FormState } from "@/actions/teachers";
import { DAY_LABELS, DAY_ORDER, DURATION_OPTIONS } from "@/lib/types";
import { TimeSelect } from "@/components/time-select";
import { IconPlus } from "@/components/icons";
import { btn, field } from "@/components/ui";

const initialState: FormState = {};

/**
 * Giáo viên thêm một buổi/tuần cho học viên (VD đang học 1 buổi/tuần, giờ
 * muốn học 2 buổi). Buổi mới dùng chung gói, số buổi và học phí với buổi cũ.
 */
export default function AddSlotForm({
  classId,
  defaultDuration,
  defaultTime,
}: {
  classId: number;
  defaultDuration: number;
  defaultTime: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addWeeklySlotAction, initialState);
  const [handled, setHandled] = useState(state);
  const [done, setDone] = useState(false);
  if (state !== handled) {
    setHandled(state);
    if (state.success) {
      setOpen(false);
      setDone(true);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setOpen(true); setDone(false); }} className={`${btn.secondary} py-2`}>
          <IconPlus className="w-4 h-4" />
          Thêm buổi trong tuần
        </button>
        {done && <span className="text-sm text-mint-700">Đã thêm buổi — xem trong lịch dạy.</span>}
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border border-wood-200 bg-white p-3 space-y-3">
      <input type="hidden" name="class_id" value={classId} />
      <p className="text-sm font-semibold text-ink-800">
        Thêm buổi trong tuần{" "}
        <span className="font-normal text-ink-500">— học viên học thêm ngày khác, dùng chung gói học</span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        <select name="day_of_week" defaultValue="1" className={`${field} py-2`} aria-label="Thứ học thêm">
          {DAY_ORDER.map((d) => (
            <option key={d} value={d}>
              {DAY_LABELS[d]}
            </option>
          ))}
        </select>
        <TimeSelect
          name="start_time"
          required
          defaultValue={defaultTime}
          className={`${field} py-2`}
          emptyLabel="Giờ học"
          aria-label="Giờ học thêm"
        />
        <select name="duration_minutes" defaultValue={String(defaultDuration)} className={`${field} py-2`} aria-label="Thời lượng">
          {DURATION_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m} phút
            </option>
          ))}
        </select>
      </div>
      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={`${btn.primary} py-2`}>
          {pending ? "Đang thêm..." : "Thêm buổi"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btn.ghost}>
          Huỷ
        </button>
      </div>
    </form>
  );
}
