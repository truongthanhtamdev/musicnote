"use client";

import { useActionState, useState } from "react";
import { teacherRescheduleAction } from "@/actions/reschedule";
import type { FormState } from "@/actions/teachers";
import type { FreeSlotOption, TeacherUpcomingSession } from "@/lib/queries";
import { ATTENDANCE_STATUS_LABELS, DAY_LABELS } from "@/lib/types";
import { Modal } from "@/components/modal";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

/** "T5 12/09 · 19:30" — đọc nhanh hơn ngày ISO. */
function slotLabel(slot: FreeSlotOption): string {
  const [, month, day] = slot.date.split("-");
  return `${DAY_LABELS[slot.dayOfWeek]} ${day}/${month} · ${slot.time}`;
}

function dateLabel(date: string, time: string): string {
  const [, month, day] = date.split("-");
  const dow = DAY_LABELS[new Date(`${date}T00:00:00`).getDay()];
  return `${dow} ${day}/${month} · ${time}`;
}

function awayLabel(daysAway: number): string {
  if (daysAway === 0) return "hôm nay";
  if (daysAway === 1) return "ngày mai";
  return `còn ${daysAway} ngày`;
}

/**
 * Giáo viên tự dời buổi cho khách.
 *
 * Gom theo khách vì khách hay xin dời cả tuần một lúc: học thứ 2 và thứ 5 mà
 * tuần này bận thì dời cả hai. Để hai buổi cạnh nhau là dời xong trong một
 * chỗ, khỏi đi tìm hai lớp riêng.
 */
export default function ReschedulePanel({
  groups,
  freeSlots,
}: {
  groups: { customer: string; phone: string | null; sessions: TeacherUpcomingSession[] }[];
  freeSlots: FreeSlotOption[];
}) {
  const [target, setTarget] = useState<TeacherUpcomingSession | null>(null);
  const [state, formAction, pending] = useActionState(teacherRescheduleAction, initialState);

  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.success) setTarget(null);
  }

  if (groups.length === 0) {
    return <p className="text-sm text-ink-500">Không có buổi nào trong hai tuần tới.</p>;
  }

  return (
    <>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={`${g.customer}|${g.phone ?? ""}`} className="rounded-xl border border-navy-100 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="font-semibold text-ink-900">{g.customer}</p>
              {g.phone && <p className="text-xs text-ink-500 tabular">{g.phone}</p>}
            </div>

            <ul className="mt-3 space-y-2">
              {g.sessions.map((s) => {
                const moved = s.recorded?.status === "rescheduled";
                return (
                  <li
                    key={`${s.cls.id}|${s.date}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ivory-50 border border-navy-100 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">
                        {dateLabel(s.date, s.time)}{" "}
                        <span className="font-normal text-ink-400">· {s.cls.subject}</span>
                      </p>
                      {s.recorded ? (
                        <p className="text-xs text-amber-700 mt-0.5">
                          {ATTENDANCE_STATUS_LABELS[s.recorded.status]}
                          {moved && s.recorded.toDate
                            ? ` → ${dateLabel(s.recorded.toDate, s.recorded.toTime ?? "")}`
                            : ""}
                        </p>
                      ) : (
                        <p className="text-xs text-ink-400 mt-0.5">
                          {awayLabel(s.daysAway)}
                          {s.pendingRequest ? " · khách đang chờ duyệt đơn dời" : ""}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setTarget(s)}
                      className={`${btn.secondary} py-1.5 text-xs`}
                    >
                      {moved ? "Đổi giờ bù" : "Dời buổi"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Dời buổi cho khách"
        subtitle={
          target
            ? `${target.cls.student_name} · ${target.cls.subject} · ${dateLabel(target.date, target.time)}`
            : undefined
        }
      >
        {!target ? null : freeSlots.length === 0 ? (
          <p className="text-sm text-ink-600">
            Lịch của bạn đã kín trong 3 tuần tới, không còn khung nào để xếp bù.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="class_id" value={target.cls.id} />
            <input type="hidden" name="session_date" value={target.date} />

            <div>
              <label className={label} htmlFor="tr-slot">
                Học bù vào
              </label>
              <select id="tr-slot" name="slot" required defaultValue="" className={field}>
                <option value="" disabled>
                  -- Chọn giờ bạn còn trống --
                </option>
                {freeSlots.map((s) => (
                  <option key={`${s.date} ${s.time}`} value={`${s.date} ${s.time}`}>
                    {slotLabel(s)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-400 mt-1.5">
                Chỉ hiện giờ bạn đang rảnh, nên không sợ xếp trùng lớp khác.
              </p>
            </div>

            <div>
              <label className={label} htmlFor="tr-reason">
                Ghi chú
              </label>
              <input
                id="tr-reason"
                name="reason"
                maxLength={300}
                placeholder="VD: khách bận việc, xin dời tuần này"
                className={field}
              />
            </div>

            <p className="text-xs text-ink-500 bg-ivory-100 rounded-lg px-3 py-2">
              Chỉ dời đúng buổi này. Lịch cố định hàng tuần không đổi — tuần sau lớp vẫn học vào{" "}
              <span className="font-semibold text-ink-700">
                {DAY_LABELS[target.cls.day_of_week]} {target.cls.start_time}
              </span>{" "}
              như cũ.
            </p>

            {state.error && <p className="text-sm text-coral-600">{state.error}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setTarget(null)} className={btn.secondary}>
                Huỷ
              </button>
              <button type="submit" disabled={pending} className={btn.primary}>
                {pending ? "Đang lưu…" : "Xác nhận dời"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
