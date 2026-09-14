"use client";

import { useActionState, useState } from "react";
import { submitRatingAction } from "@/actions/ratings";
import type { FormState } from "@/actions/teachers";

const initialState: FormState = {};
const LABELS = ["", "Rất tệ", "Chưa tốt", "Bình thường", "Tốt", "Rất tốt"];

/**
 * Năm ngôi sao cho khách bấm. Cố ý làm sao thật to: khách chấm trên điện
 * thoại, ngay sau buổi học, thường là bấm một cái rồi đóng.
 */
export default function RatingForm({
  token,
  current,
  currentComment,
}: {
  token: string;
  current: number | null;
  currentComment: string | null;
}) {
  const [state, formAction, pending] = useActionState(submitRatingAction, initialState);
  const [stars, setStars] = useState(current ?? 0);
  const [hover, setHover] = useState(0);
  const shown = hover || stars;

  if (state.success) {
    return (
      <div className="text-center py-6">
        <p className="text-5xl mb-3" aria-hidden="true">
          🎵
        </p>
        <p className="text-lg font-semibold text-ink-900">Cảm ơn bạn đã đánh giá!</p>
        <p className="text-sm text-ink-500 mt-1">
          Trung tâm đọc hết mọi nhận xét để lo cho các buổi học sau tốt hơn.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="stars" value={stars} />

      <div className="flex justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} sao — ${LABELS[n]}`}
            aria-pressed={stars === n}
            className={`text-4xl sm:text-5xl leading-none transition ${
              n <= shown ? "text-amber-500" : "text-ink-200"
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <p className="text-center text-sm font-semibold h-5 text-ink-700">
        {shown ? LABELS[shown] : "Bạn chấm buổi học mấy sao?"}
      </p>

      <textarea
        name="comment"
        defaultValue={currentComment ?? ""}
        rows={3}
        placeholder="Nhận xét thêm (không bắt buộc) — điều gì bạn thích, điều gì mong thầy cô làm tốt hơn?"
        aria-label="Nhận xét"
        className="w-full rounded-xl border border-navy-200 px-3 py-2 text-sm"
      />

      {state.error && <p className="text-sm text-coral-600 text-center">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || stars === 0}
        className="w-full bg-wood-500 hover:bg-wood-600 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3"
      >
        {pending ? "Đang gửi..." : current ? "Cập nhật đánh giá" : "Gửi đánh giá"}
      </button>
    </form>
  );
}
