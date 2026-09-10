"use client";

import { useActionState, useState } from "react";
import { cancelRescheduleAction, requestRescheduleAction } from "@/actions/reschedule";
import type { FormState } from "@/actions/teachers";
import type { FreeSlotOption } from "@/lib/queries";
import { DAY_LABELS, type RescheduleRequestRow } from "@/lib/types";
import { Modal } from "@/components/modal";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

/** "T5 12/09 · 19:30" — đủ để khách chọn mà không phải đọc ngày ISO. */
function slotLabel(slot: FreeSlotOption): string {
  const [, month, day] = slot.date.split("-");
  return `${DAY_LABELS[slot.dayOfWeek]} ${day}/${month} · ${slot.time}`;
}

export default function RescheduleButton({
  classId,
  sessionDate,
  sessionLabel,
  freeSlots,
  pendingRequest,
}: {
  classId: number;
  sessionDate: string;
  /** Buổi đang xin dời, hiện ở phụ đề hộp thoại. */
  sessionLabel: string;
  /** Khung giờ giáo viên còn trống — khách chỉ chọn được trong danh sách này. */
  freeSlots: FreeSlotOption[];
  pendingRequest: RescheduleRequestRow | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(requestRescheduleAction, initialState);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setOpen(false);
  }

  if (pendingRequest) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          Đã gửi yêu cầu dời sang {pendingRequest.to_date} {pendingRequest.to_time} — chờ giáo viên
          duyệt
        </span>
        <form action={cancelRescheduleAction.bind(null, pendingRequest.id)}>
          <button type="submit" className="text-xs font-semibold text-ink-500 hover:text-ink-900 px-2 py-1.5">
            Rút lại
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${btn.secondary} py-2`}>
        Xin dời buổi này
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Xin dời buổi học"
        subtitle={sessionLabel}
      >
        {freeSlots.length === 0 ? (
          <p className="text-sm text-ink-600">
            Giáo viên hiện chưa còn khung trống nào trong 3 tuần tới. Bạn nhắn trực tiếp cho trung
            tâm để được sắp xếp nhé.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="class_id" value={classId} />
            <input type="hidden" name="session_date" value={sessionDate} />

            <div>
              <label className={label} htmlFor={`slot-${classId}-${sessionDate}`}>
                Chọn giờ học bù
              </label>
              <select
                id={`slot-${classId}-${sessionDate}`}
                name="slot"
                required
                defaultValue=""
                className={field}
              >
                <option value="" disabled>
                  -- Chọn giờ giáo viên còn trống --
                </option>
                {freeSlots.map((s) => (
                  <option key={`${s.date} ${s.time}`} value={`${s.date} ${s.time}`}>
                    {slotLabel(s)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-400 mt-1.5">
                Danh sách chỉ hiện giờ giáo viên của bạn đang rảnh.
              </p>
            </div>

            <div>
              <label className={label} htmlFor={`reason-${classId}-${sessionDate}`}>
                Lý do
              </label>
              <input
                id={`reason-${classId}-${sessionDate}`}
                name="reason"
                maxLength={300}
                placeholder="Không bắt buộc — VD: bé bị ốm"
                className={field}
              />
            </div>

            {state.error && <p className="text-sm text-coral-600">{state.error}</p>}

            <button type="submit" disabled={pending} className={`${btn.primary} w-full py-3`}>
              {pending ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
            <p className="text-xs text-ink-400">
              Yêu cầu cần giáo viên duyệt. Nếu không báo trước mà nghỉ, buổi đó vẫn bị tính tiết.
            </p>
          </form>
        )}
      </Modal>
    </>
  );
}
