"use client";

import { useState } from "react";
import { formatVND } from "@/lib/format";
import { TRIAL_SESSION_RATE } from "@/lib/types";

/**
 * Ô "Đây là buổi học thử" + ô "Buổi thứ mấy" của form điểm danh.
 *
 * Trước đây muốn tính buổi học thử phải gõ số 0 vào ô buổi thứ mấy — không ai
 * đoán ra, nên buổi học thử của lớp giáo viên tự thêm bị tính như tiết thường.
 * Ô tick gửi `is_trial` = 1/0; bỏ tick thì mới hiện ô số buổi.
 */
export function SessionNumberField({
  idPrefix,
  defaultTrial,
  defaultNumber,
  number,
  onNumberChange,
  trial,
  onTrialChange,
  compact = false,
}: {
  idPrefix: string;
  defaultTrial?: boolean;
  defaultNumber?: number | string;
  /** Điều khiển từ ngoài (form điểm danh bù tự điền khi chọn lớp). */
  number?: string;
  onNumberChange?: (v: string) => void;
  trial?: boolean;
  onTrialChange?: (v: boolean) => void;
  compact?: boolean;
}) {
  const [ownTrial, setOwnTrial] = useState(!!defaultTrial);
  const isTrial = trial ?? ownTrial;
  const setTrial = onTrialChange ?? setOwnTrial;

  return (
    <div className={compact ? "flex flex-wrap items-center gap-3" : "space-y-2.5"}>
      <input type="hidden" name="is_trial" value={isTrial ? "1" : "0"} />
      <label
        className={`flex items-start gap-2.5 cursor-pointer ${
          compact ? "text-sm" : "rounded-2xl border px-3.5 py-3"
        } ${!compact && isTrial ? "border-wood-300 bg-wood-50" : !compact ? "border-navy-100 bg-ivory-50" : ""}`}
      >
        <input
          type="checkbox"
          checked={isTrial}
          onChange={(e) => setTrial(e.target.checked)}
          className="w-4.5 h-4.5 mt-0.5 rounded border-navy-300 accent-[var(--color-wood-500)]"
        />
        <span className="text-sm text-ink-800">
          <b>Đây là buổi học thử</b>
          <span className="text-ink-500"> — tính {formatVND(TRIAL_SESSION_RATE)}/tiết, không trừ vào gói</span>
        </span>
      </label>
      {!isTrial && (
        <label className={compact ? "flex items-center gap-1.5 text-sm text-ink-700" : "block"} htmlFor={`${idPrefix}-session`}>
          <span className={compact ? "whitespace-nowrap" : "block text-sm font-medium text-ink-700 mb-1.5"}>Buổi thứ mấy</span>
          <input
            id={`${idPrefix}-session`}
            name="session_number"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            {...(number !== undefined
              ? { value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onNumberChange?.(e.target.value) }
              : { defaultValue: defaultNumber ?? "" })}
            placeholder="VD: 15"
            className={`w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 tabular ${
              compact ? "!w-20 py-1.5" : ""
            }`}
          />
          {!compact && (
            <span className="block text-xs text-ink-400 mt-1.5">Số tự nhảy theo buổi trước, bạn vẫn sửa được.</span>
          )}
        </label>
      )}
    </div>
  );
}
