import type { NoteValue } from "@/lib/piano";

/**
 * Vẽ hình một nốt theo trường độ: đầu rỗng/đặc, có đuôi hay không, mấy móc.
 *
 * Vẽ bằng SVG thay vì dùng ký tự nhạc trong font chữ, vì máy khách không phải
 * lúc nào cũng có font nhạc — thiếu font là ra ô vuông trống, đúng chỗ người
 * học cần nhìn nhất.
 */
export function NoteValueGlyph({ value }: { value: NoteValue }) {
  const cx = 16;
  const cy = 46;
  const stemX = cx + 8.5;
  const stemTop = cy - 38;

  return (
    <svg viewBox="0 0 44 60" width={44} height={60} role="img" aria-label={value.name}>
      <ellipse
        cx={cx}
        cy={cy}
        rx={9}
        ry={6.8}
        fill={value.filled ? "#10243e" : "none"}
        stroke="#10243e"
        strokeWidth={value.filled ? 0 : 2.4}
        transform={`rotate(-20 ${cx} ${cy})`}
      />
      {value.stem && (
        <line x1={stemX} y1={cy - 1} x2={stemX} y2={stemTop} stroke="#10243e" strokeWidth={2} />
      )}
      {Array.from({ length: value.flags }, (_, i) => (
        <path
          key={i}
          d={`M ${stemX} ${stemTop + i * 9} q 11 5 10 16 q -3 -8 -10 -10 z`}
          fill="#10243e"
        />
      ))}
    </svg>
  );
}

/** Thanh thời gian: nốt này chiếm bao nhiêu trong ô nhịp 4 phách. */
export function BeatBar({ beats }: { beats: number }) {
  const pct = Math.max((beats / 4) * 100, 4);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 flex-1 rounded-full bg-ivory-100 overflow-hidden">
        <div className="h-full rounded-full bg-wood-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-ink-600 tabular whitespace-nowrap">
        {beats >= 1 ? beats : beats === 0.5 ? "½" : "¼"} phách
      </span>
    </div>
  );
}
