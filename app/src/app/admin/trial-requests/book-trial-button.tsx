"use client";

import { useActionState, useState } from "react";
import { bookTrialAction, type BookTrialState } from "@/actions/trial";
import { DAY_LABELS, DAY_ORDER, SUBJECT_SUGGESTIONS } from "@/lib/types";
import { TimeSelect } from "@/components/time-select";
import { btn, field, label } from "@/components/ui";

const initialState: BookTrialState = {};

/**
 * Nút "Đặt hẹn" cho một đăng ký học thử: chọn thứ + giờ là xong.
 *
 * Cố ý chỉ hỏi đúng thứ nhân viên đặt hẹn biết khi gọi khách — ngày giờ khách
 * rảnh. Giáo viên để Quản lý chọn sau ở trang Giao lớp, vì chọn giáo viên cần
 * nhìn lịch dạy của cả trung tâm.
 */
export default function BookTrialButton({
  requestId,
  customerName,
  subject,
  booked,
}: {
  requestId: number;
  customerName: string;
  subject: string;
  /**
   * Đã đặt hẹn rồi thì ẩn nút, nhưng component vẫn phải nằm trên trang: lưu
   * xong trang tải lại dòng này với trạng thái mới, nếu gỡ hẳn component thì
   * hộp thoại biến mất trước khi người bấm kịp thấy lời xác nhận.
   */
  booked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(bookTrialAction, initialState);

  return (
    <>
      {!booked && (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-white bg-wood-500 hover:bg-wood-600 rounded-lg px-3 py-1.5 whitespace-nowrap"
      >
        Đặt hẹn
      </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]"
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 text-left shadow-xl max-h-[90vh] overflow-y-auto">
            {state.success ? (
              <div className="text-center py-4">
                <p className="text-lg font-bold text-ink-900">Đã đặt hẹn học thử</p>
                <p className="text-sm text-ink-600 mt-2">
                  Buổi hẹn của {customerName} đã chuyển sang Quản lý để giao giáo viên. Khi buổi học
                  thử diễn ra, thưởng học thử tự ghi cho bạn.
                </p>
                <button type="button" onClick={() => setOpen(false)} className={`${btn.primary} mt-4`}>
                  Xong
                </button>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                <div>
                  <p className="text-lg font-bold text-ink-900">Đặt hẹn học thử</p>
                  <p className="text-sm text-ink-500">{customerName}</p>
                </div>
                <input type="hidden" name="trial_request_id" value={requestId} />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label} htmlFor={`bt-day-${requestId}`}>
                      Thứ
                    </label>
                    <select
                      id={`bt-day-${requestId}`}
                      name="day_of_week"
                      required
                      defaultValue=""
                      className={field}
                    >
                      <option value="" disabled>
                        -- Chọn thứ --
                      </option>
                      {DAY_ORDER.map((d) => (
                        <option key={d} value={d}>
                          {d === 0 ? "Chủ nhật" : `Thứ ${d + 1}`} ({DAY_LABELS[d]})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={label} htmlFor={`bt-time-${requestId}`}>
                      Giờ
                    </label>
                    <TimeSelect id={`bt-time-${requestId}`} name="start_time" required className={field} />
                  </div>
                </div>

                <div>
                  <label className={label} htmlFor={`bt-subject-${requestId}`}>
                    Môn
                  </label>
                  <select id={`bt-subject-${requestId}`} name="subject" defaultValue={subject} className={field}>
                    {SUBJECT_SUGGESTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={label} htmlFor={`bt-note-${requestId}`}>
                    Ghi chú cho Quản lý
                  </label>
                  <input
                    id={`bt-note-${requestId}`}
                    name="note"
                    className={field}
                    placeholder="VD: khách muốn cô giáo, bé 7 tuổi"
                  />
                </div>

                {state.error && <p className="text-sm text-coral-600">{state.error}</p>}

                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setOpen(false)} className={btn.ghost}>
                    Huỷ
                  </button>
                  <button type="submit" disabled={pending} className={btn.primary}>
                    {pending ? "Đang lưu…" : "Xác nhận đặt hẹn"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
