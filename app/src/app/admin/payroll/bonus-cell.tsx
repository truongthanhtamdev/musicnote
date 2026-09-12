"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addPayrollAdjustmentAction,
  deletePayrollAdjustmentAction,
} from "@/actions/finance";
import type { FormState } from "@/actions/teachers";
import type { PayrollAdjustmentRow } from "@/lib/queries";
import { formatVND } from "@/lib/format";
import { btn, field, inlineAction } from "@/components/ui";

const initialState: FormState = {};

/**
 * Thưởng / tip / phụ cấp cộng thêm cho giáo viên trong kỳ lương.
 *
 * Nhập ngay trên dòng lương chứ không phải trang riêng: lúc trả lương mới là
 * lúc nhớ ra "bạn này tháng rồi khách khen, cộng thêm 200k". Gõ số âm để trừ.
 */
export default function BonusCell({
  teacherId,
  teacherName,
  adjustments,
  total,
  defaultDate,
}: {
  teacherId: number;
  teacherName: string;
  adjustments: PayrollAdjustmentRow[];
  total: number;
  /** Ngày mặc định của khoản mới — ngày cuối kỳ đang xem. */
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addPayrollAdjustmentAction, initialState);
  const [removing, startRemove] = useTransition();

  // Đóng form ngay khi lưu xong, chỉnh state lúc render thay vì dùng effect.
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.success) setOpen(false);
  }

  return (
    <div className="text-right">
      {total !== 0 && (
        <p
          className={`tabular font-semibold whitespace-nowrap ${
            total > 0 ? "text-mint-700" : "text-coral-700"
          }`}
        >
          {total > 0 ? "+" : "−"}
          {formatVND(Math.abs(total))}
        </p>
      )}

      {adjustments.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {adjustments.map((a) => (
            <li key={a.id} className="text-xs text-ink-500 flex items-center justify-end gap-1.5">
              <span className="tabular">
                {a.amount > 0 ? "+" : "−"}
                {formatVND(Math.abs(a.amount))}
              </span>
              {a.reason && <span className="truncate max-w-[90px]">{a.reason}</span>}
              <button
                type="button"
                disabled={removing}
                aria-label={`Xoá khoản ${formatVND(Math.abs(a.amount))} của ${teacherName}`}
                onClick={() => startRemove(() => deletePayrollAdjustmentAction(a.id))}
                className="text-coral-600 hover:text-coral-700 disabled:opacity-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form action={formAction} className="mt-1.5 flex flex-wrap justify-end gap-1.5">
          <input type="hidden" name="teacher_id" value={teacherId} />
          <input type="hidden" name="adjustment_date" value={defaultDate} />
          <input
            type="number"
            name="amount"
            step="1000"
            required
            autoFocus
            placeholder="200000"
            aria-label={`Số tiền thưởng cho ${teacherName}`}
            className={`${field} w-28 py-1 text-right tabular`}
          />
          <input
            type="text"
            name="reason"
            placeholder="Lý do"
            aria-label={`Lý do thưởng cho ${teacherName}`}
            className={`${field} w-28 py-1`}
          />
          <button type="submit" disabled={pending} className={`${btn.primary} py-1 disabled:opacity-50`}>
            {pending ? "..." : "Lưu"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className={inlineAction}>
            Huỷ
          </button>
          {state.error && <p className="basis-full text-xs text-coral-600">{state.error}</p>}
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={`${inlineAction} mt-0.5`}>
          + Thưởng
        </button>
      )}
    </div>
  );
}
