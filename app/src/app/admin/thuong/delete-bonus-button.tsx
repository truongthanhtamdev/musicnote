"use client";

import { useState } from "react";
import { deleteBonusAction } from "@/actions/bonus";

/**
 * Gỡ một khoản ghi nhầm — thường là lớp gán sai giáo vụ, hoặc khách huỷ sau
 * khi đã ghi thu. Hỏi lại một lần vì gỡ rồi không tự ghi lại được.
 */
export default function DeleteBonusButton({ id }: { id: number }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-semibold text-ink-400 hover:text-coral-600 px-2 py-1"
      >
        Gỡ
      </button>
    );
  }
  return (
    <form action={deleteBonusAction.bind(null, id)} className="inline-flex items-center gap-1">
      <button type="submit" className="text-xs font-semibold text-coral-600 hover:text-coral-700 px-2 py-1">
        Xác nhận
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs text-ink-400 hover:text-ink-700 px-1"
      >
        Huỷ
      </button>
    </form>
  );
}
