"use client";

import { useActionState } from "react";
import { saveLateCheckinQuotaAction } from "@/actions/settings";
import type { FormState } from "@/actions/teachers";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

export default function QuotaForm({ quota }: { quota: number }) {
  const [state, formAction, pending] = useActionState(saveLateCheckinQuotaAction, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <div>
        <label className={label} htmlFor="late_checkin_free_quota">
          Số lần điểm danh bù được tha mỗi kỳ lương
        </label>
        <input
          id="late_checkin_free_quota"
          name="late_checkin_free_quota"
          type="number"
          min={0}
          max={99}
          step={1}
          inputMode="numeric"
          defaultValue={quota}
          className={`${field} tabular w-32`}
        />
        <p className="text-xs text-ink-400 mt-1.5">
          Điền 0 nghĩa là mọi buổi điểm danh bù đều không tính công. Điền số lớn thì coi như tắt
          quy định này.
        </p>
      </div>

      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
      {state.success && <p className="text-sm text-mint-600">Đã lưu quy định.</p>}

      <button type="submit" disabled={pending} className={btn.primary}>
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
    </form>
  );
}
