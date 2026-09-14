import type { TeacherRating } from "@/lib/queries";

/**
 * Điểm khách chấm của một giáo viên: trung bình, số lượt, và nhắc riêng khi
 * có buổi bị chấm 1–2 sao — một lượt thấp giữa mười lượt tốt vẫn phải thấy,
 * chứ trung bình sẽ che mất.
 */
export function TeacherStars({ rating }: { rating: TeacherRating | undefined }) {
  if (!rating || rating.count === 0) return <span className="text-ink-300">–</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-amber-600 font-semibold">★ {rating.average.toFixed(1)}</span>
      <span className="text-xs text-ink-400">({rating.count})</span>
      {rating.low > 0 && (
        <span className="text-xs font-semibold text-coral-600" title="Số buổi bị chấm 1–2 sao">
          {rating.low} thấp
        </span>
      )}
    </span>
  );
}
