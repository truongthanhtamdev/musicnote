"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addWeeklySlotAction,
  endWeeklySlotAction,
  moveWeeklySlotAction,
  removeWeeklySlotAction,
} from "@/actions/classes";
import type { FormState } from "@/actions/teachers";
import {
  DAY_LABELS,
  DAY_ORDER,
  DURATION_OPTIONS,
  classStage,
  formatClassSchedule,
  type ClassRow,
} from "@/lib/types";
import { TimeSelect } from "@/components/time-select";
import { IconPlus, IconX } from "@/components/icons";
import { btn, field, inlineAction, label } from "@/components/ui";

const initialState: FormState = {};

export interface WeeklySlot {
  id: number;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  schedule_type: ClassRow["schedule_type"];
  stage: ClassRow["stage"];
}

/**
 * Lịch tuần của một lớp: học viên học 2-3 buổi/tuần thì mỗi buổi là một dòng
 * riêng dùng chung gói học, nên ở đây thêm/bớt/đổi được từng buổi mà tiến độ
 * gói và học phí vẫn gộp chung.
 *
 * Buổi đã dạy rồi thì KHÔNG xoá — học viên bỏ buổi thứ Tư mà xoá dòng đó là
 * mất luôn lịch sử điểm danh và tiền công của những buổi Tư đã dạy. Thay vào
 * đó "Ngừng buổi này": biến khỏi lịch tuần, sổ sách giữ nguyên, cần thì cho
 * học lại.
 */
export default function WeeklySlots({
  classId,
  slots,
  maxSlots = 7,
}: {
  /** Buổi đang mở trang — không cho xoá chính nó để lớp luôn còn ít nhất 1 buổi. */
  classId: number;
  slots: WeeklySlot[];
  maxSlots?: number;
}) {
  const [state, formAction, pending] = useActionState(addWeeklySlotAction, initialState);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState<number | null>(null);
  const [busy, startTransition] = useTransition();

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setAdding(false);
  }

  const active = slots.filter((s) => classStage(s.stage).status !== "ended");
  const full = active.length >= maxSlots;

  function run(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        setMoving(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không thực hiện được");
      }
    });
  }

  return (
    <div className="p-5 space-y-3">
      <ul className="space-y-2">
        {slots.map((s) => {
          const ended = classStage(s.stage).status === "ended";
          return (
            <li
              key={s.id}
              className={`rounded-xl border px-3.5 py-2.5 ${
                ended ? "border-navy-100 bg-white" : "border-navy-100 bg-ivory-50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <span
                  className={`text-sm font-medium tabular ${
                    ended ? "text-ink-400 line-through" : "text-ink-900"
                  }`}
                >
                  {formatClassSchedule(s)}
                </span>

                <span className="flex items-center gap-2">
                  {ended ? (
                    <>
                      <span className="text-xs font-semibold text-ink-400">Đã ngừng</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => endWeeklySlotAction(s.id, false))}
                        className={inlineAction}
                      >
                        Học lại buổi này
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setMoving(moving === s.id ? null : s.id)}
                        className={inlineAction}
                      >
                        Đổi ngày/giờ
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(
                              `Ngừng buổi ${formatClassSchedule(s)}? Buổi này biến khỏi lịch tuần từ giờ trở đi, lịch sử điểm danh và tiền công đã chấm vẫn giữ nguyên.`
                            )
                          ) {
                            run(() => endWeeklySlotAction(s.id, true));
                          }
                        }}
                        className="text-sm font-semibold text-coral-600 hover:text-coral-700 disabled:opacity-50"
                      >
                        Ngừng buổi này
                      </button>
                      {s.id !== classId && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => removeWeeklySlotAction(s.id))}
                          aria-label={`Xoá hẳn buổi ${formatClassSchedule(s)}`}
                          title="Xoá hẳn — chỉ được khi buổi này chưa từng điểm danh"
                          className="p-1.5 -mr-1 rounded-lg text-ink-300 hover:text-coral-600 hover:bg-coral-50 transition"
                        >
                          <IconX className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </span>
              </div>

              {moving === s.id && (
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                  <label className="text-xs text-ink-500">
                    Ngày
                    <select
                      defaultValue={String(s.day_of_week)}
                      id={`move-day-${s.id}`}
                      className={`${field} py-1.5 mt-1`}
                    >
                      {DAY_ORDER.map((d) => (
                        <option key={d} value={d}>
                          {DAY_LABELS[d]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-ink-500">
                    Giờ
                    <TimeSelect
                      id={`move-time-${s.id}`}
                      defaultValue={s.start_time}
                      className={`${field} py-1.5 mt-1`}
                      emptyLabel="Giờ học"
                    />
                  </label>
                  <label className="text-xs text-ink-500">
                    Thời lượng
                    <select
                      id={`move-dur-${s.id}`}
                      defaultValue={String(s.duration_minutes)}
                      className={`${field} py-1.5 mt-1`}
                    >
                      {DURATION_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m} phút
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      const day = Number(
                        (document.getElementById(`move-day-${s.id}`) as HTMLSelectElement).value
                      );
                      const time = (
                        document.getElementById(`move-time-${s.id}`) as HTMLSelectElement
                      ).value;
                      const dur = Number(
                        (document.getElementById(`move-dur-${s.id}`) as HTMLSelectElement).value
                      );
                      if (!time) return;
                      run(() => moveWeeklySlotAction(s.id, day, time, dur));
                    }}
                    className={`${btn.primary} py-1.5 disabled:opacity-50`}
                  >
                    Lưu lịch mới
                  </button>
                </div>
              )}
            </li>
          );
        })}
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
        Các buổi trong tuần dùng chung một gói học, nên tiến độ tiết và học phí tính gộp. Học viên
        bỏ một buổi thì bấm <span className="font-semibold text-ink-500">Ngừng buổi này</span> —
        giữ nguyên lịch sử đã dạy; chỉ xoá hẳn buổi chưa từng điểm danh.
      </p>
    </div>
  );
}
