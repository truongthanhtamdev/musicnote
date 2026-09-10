"use client";

import { useActionState, useState } from "react";
import { confirmSessionAction, requestOffAction, unconfirmSessionAction } from "@/actions/session";
import type { FormState } from "@/actions/teachers";
import type { FreeSlotOption } from "@/lib/queries";
import { CANCEL_NOTICE_HOURS, type RescheduleRequestRow } from "@/lib/types";
import { Modal } from "@/components/modal";
import { IconCheck, IconCheckCircle } from "@/components/icons";
import { StatusChip, btn, field, label } from "@/components/ui";
import RescheduleButton from "./reschedule-button";

const initialState: FormState = {};

/**
 * Ba việc học viên làm với một buổi sắp tới: xác nhận sẽ tham gia, xin dời sang
 * giờ khác, hoặc xin nghỉ hẳn buổi đó. Gom một chỗ để thứ tự ưu tiên rõ ràng —
 * xác nhận là việc thường làm nhất nên đứng đầu và nổi nhất.
 */
export default function SessionActions({
  classId,
  sessionDate,
  sessionLabel,
  confirmed,
  canReschedule,
  freeSlots,
  pendingRequest,
  noticeInTime,
}: {
  classId: number;
  sessionDate: string;
  sessionLabel: string;
  confirmed: boolean;
  /** Buổi học bù đã chốt thì không xin dời tiếp, chỉ xác nhận hoặc xin nghỉ. */
  canReschedule: boolean;
  freeSlots: FreeSlotOption[];
  pendingRequest: RescheduleRequestRow | null;
  /** Xin nghỉ lúc này còn kịp hạn báo trước, tức là không bị trừ tiết. */
  noticeInTime: boolean;
}) {
  const [confirmState, confirmAction, confirming] = useActionState(
    confirmSessionAction,
    initialState
  );
  const [offOpen, setOffOpen] = useState(false);
  const [offState, offAction, offPending] = useActionState(requestOffAction, initialState);

  const [handledOff, setHandledOff] = useState(offState);
  if (offState !== handledOff) {
    setHandledOff(offState);
    if (offState.success) setOffOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      {confirmed ? (
        <>
          <StatusChip tone="mint" icon={<IconCheckCircle className="w-3.5 h-3.5" />}>
            Đã xác nhận tham gia
          </StatusChip>
          <form action={unconfirmSessionAction.bind(null, classId, sessionDate)}>
            <button
              type="submit"
              className="text-xs font-semibold text-ink-500 hover:text-ink-900 px-2 py-2"
            >
              Bỏ xác nhận
            </button>
          </form>
        </>
      ) : (
        <form action={confirmAction}>
          <input type="hidden" name="class_id" value={classId} />
          <input type="hidden" name="session_date" value={sessionDate} />
          <button
            type="submit"
            disabled={confirming}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-mint-500 hover:bg-mint-600 disabled:opacity-60 text-white font-semibold px-4 py-2 text-sm transition"
          >
            <IconCheck className="w-4 h-4" />
            {confirming ? "Đang gửi..." : "Xác nhận tham gia"}
          </button>
        </form>
      )}

      {canReschedule && (
        <RescheduleButton
          classId={classId}
          sessionDate={sessionDate}
          sessionLabel={sessionLabel}
          freeSlots={freeSlots}
          pendingRequest={pendingRequest}
        />
      )}

      {!pendingRequest && (
        <button
          type="button"
          onClick={() => setOffOpen(true)}
          className={`${btn.ghost} py-2`}
        >
          Xin nghỉ buổi này
        </button>
      )}

      {confirmState.error && (
        <span className="basis-full text-right text-xs text-coral-600">{confirmState.error}</span>
      )}

      <Modal
        open={offOpen}
        onClose={() => setOffOpen(false)}
        title="Xin nghỉ buổi này"
        subtitle={sessionLabel}
      >
        <form action={offAction} className="space-y-4">
          <input type="hidden" name="class_id" value={classId} />
          <input type="hidden" name="session_date" value={sessionDate} />

          <p className="text-sm text-ink-700">
            Buổi này sẽ được bỏ qua và <span className="font-semibold">không cần học bù</span> —
            lịch của bạn giữ nguyên và học tiếp vào tuần sau như thường lệ.
          </p>

          <div
            className={`rounded-2xl border px-3.5 py-3 text-sm ${
              noticeInTime
                ? "border-mint-200 bg-mint-50 text-ink-700"
                : "border-amber-200 bg-amber-50 text-ink-700"
            }`}
          >
            {noticeInTime ? (
              <>
                Bạn báo sớm trước {CANCEL_NOTICE_HOURS} tiếng nên buổi này{" "}
                <span className="font-semibold">không bị trừ vào gói học</span>. Cảm ơn bạn đã báo
                sớm giúp giáo viên sắp xếp lịch.
              </>
            ) : (
              <>
                Buổi học bắt đầu trong vòng {CANCEL_NOTICE_HOURS} tiếng nữa, giáo viên đã giữ sẵn
                khung giờ này cho bạn nên buổi này{" "}
                <span className="font-semibold">vẫn được tính vào gói học</span>. Nếu chỉ bận giờ
                này thôi, bạn thử chọn &ldquo;Xin dời buổi này&rdquo; để học bù giờ khác nhé.
              </>
            )}
          </div>

          <div>
            <label className={label} htmlFor={`off-reason-${classId}-${sessionDate}`}>
              Lý do
            </label>
            <input
              id={`off-reason-${classId}-${sessionDate}`}
              name="reason"
              maxLength={300}
              placeholder="Không bắt buộc — VD: nhà có việc bận"
              className={field}
            />
          </div>

          {offState.error && <p className="text-sm text-coral-600">{offState.error}</p>}

          <button type="submit" disabled={offPending} className={`${btn.danger} w-full py-3`}>
            {offPending ? "Đang gửi..." : "Xác nhận xin nghỉ"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
