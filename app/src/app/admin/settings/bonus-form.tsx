"use client";

import { useActionState } from "react";
import { saveBonusRatesAction } from "@/actions/settings";
import type { FormState } from "@/actions/teachers";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

export default function BonusForm({ trial, conversion }: { trial: number; conversion: number }) {
  const [state, formAction, pending] = useActionState(saveBonusRatesAction, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="bonus_trial_amount">
            Thưởng mỗi buổi học thử
          </label>
          <input
            id="bonus_trial_amount"
            name="bonus_trial_amount"
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            defaultValue={trial}
            className={`${field} tabular`}
          />
          <p className="text-xs text-ink-400 mt-1.5">
            Ghi khi giáo viên điểm danh buổi học thử là &ldquo;Đã dạy&rdquo;.
          </p>
        </div>
        <div>
          <label className={label} htmlFor="bonus_conversion_amount">
            Thưởng khi chốt lớp
          </label>
          <input
            id="bonus_conversion_amount"
            name="bonus_conversion_amount"
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            defaultValue={conversion}
            className={`${field} tabular`}
          />
          <p className="text-xs text-ink-400 mt-1.5">
            Ghi khi khách đóng tiền lần đầu. Mỗi khách một lần, dù đóng nhiều đợt.
          </p>
        </div>
      </div>

      <p className="text-xs text-ink-500 bg-ivory-100 rounded-lg px-3 py-2">
        Đổi mức chỉ áp cho những khoản ghi nhận từ lúc này về sau. Khoản đã ghi giữ nguyên số tiền
        cũ — nếu không thì sổ của tháng trước sẽ tự đổi theo, không ai đối chiếu được.
      </p>

      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
      {state.success && <p className="text-sm text-mint-700">Đã lưu mức thưởng.</p>}

      <button type="submit" disabled={pending} className={btn.primary}>
        {pending ? "Đang lưu…" : "Lưu mức thưởng"}
      </button>
    </form>
  );
}
