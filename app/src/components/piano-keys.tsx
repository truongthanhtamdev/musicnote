"use client";

import { NOTE_NAMES, noteNameOfStep, octaveOfStep } from "@/lib/piano";

const WHITE_W = 26;
const WHITE_H = 104;
const BLACK_W = 16;
const BLACK_H = 64;

/** Phím đen nằm SAU nốt nào: sau Đô, Rê, Fa, Sol, La — sau Mi và Si thì không có. */
const BLACK_AFTER = [true, true, false, true, true, true, false];

/**
 * Bàn phím piano, tô sáng phím của một nốt.
 *
 * Đây là nhịp cầu mà trang nhạc lý nào cũng phải có: đọc được tên nốt trên
 * khuông rồi vẫn phải biết nó nằm ở phím nào thì mới đàn được. Vẽ luôn cụm
 * 2 phím đen / 3 phím đen vì đó chính là cái mốc để người mới dò ra nốt Đô.
 */
export function PianoKeys({
  /** Bậc so với Đô giữa; null = không tô phím nào. */
  step = null,
  /** Tô nhiều phím cùng lúc (hợp âm). Dùng thay cho `step`. */
  steps,
  /** Số quãng tám vẽ ra, mỗi quãng bắt đầu từ Đô. */
  octaves = 2,
  /** Bậc của phím Đô ngoài cùng bên trái. */
  fromStep = -7,
  showLabels = true,
  /** Có thì phím bấm được và gọi hàm này với bậc của phím. */
  onKeyClick,
}: {
  step?: number | null;
  steps?: number[];
  octaves?: number;
  fromStep?: number;
  showLabels?: boolean;
  onKeyClick?: (step: number) => void;
}) {
  const lit = new Set<number>(steps ?? (step == null ? [] : [step]));
  const interactive = !!onKeyClick;
  const whiteCount = octaves * 7;
  const width = whiteCount * WHITE_W;
  // Chừa chỗ phía dưới cho nhãn tên nốt.
  const height = WHITE_H + (showLabels ? 18 : 0);

  const whites = Array.from({ length: whiteCount }, (_, i) => fromStep + i);
  const isMiddleC = (s: number) => s === 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={
        lit.size === 0
          ? "Bàn phím piano"
          : lit.size === 1 && step != null
            ? `Phím của nốt ${noteNameOfStep(step)}${octaveOfStep(step)} trên bàn phím piano`
            : `${lit.size} phím được tô trên bàn phím piano`
      }
      className="max-w-full"
    >
      {/* Phím trắng */}
      {whites.map((s, i) => {
        const active = lit.has(s);
        return (
          <g
            key={`w${s}`}
            onClick={interactive ? () => onKeyClick(s) : undefined}
            className={interactive ? "cursor-pointer" : undefined}
            role={interactive ? "button" : undefined}
            aria-label={interactive ? `Phím ${NOTE_NAMES[((s % 7) + 7) % 7]}` : undefined}
          >
            <rect
              x={i * WHITE_W}
              y={0}
              width={WHITE_W}
              height={WHITE_H}
              rx={3}
              fill={active ? "#b06a2c" : "#fff"}
              stroke="#334155"
              strokeWidth={1}
            />
            {showLabels && (
              <text
                x={i * WHITE_W + WHITE_W / 2}
                y={WHITE_H + 13}
                textAnchor="middle"
                fontSize={9}
                fontWeight={isMiddleC(s) || active ? 700 : 500}
                fill={active ? "#b06a2c" : isMiddleC(s) ? "#10243e" : "#94a3b8"}
              >
                {NOTE_NAMES[((s % 7) + 7) % 7]}
              </text>
            )}
            {/* Đô giữa luôn có dấu riêng: đó là cái mốc để dò mọi nốt khác. */}
            {isMiddleC(s) && (
              <circle
                cx={i * WHITE_W + WHITE_W / 2}
                cy={WHITE_H - 14}
                r={5.5}
                fill="none"
                stroke={active ? "#fff" : "#b06a2c"}
                strokeWidth={1.6}
              />
            )}
          </g>
        );
      })}

      {/* Phím đen vẽ sau để nằm đè lên phím trắng */}
      {whites.map((s, i) => {
        if (!BLACK_AFTER[((s % 7) + 7) % 7]) return null;
        if (i === whiteCount - 1) return null;
        return (
          <rect
            key={`b${s}`}
            x={i * WHITE_W + WHITE_W - BLACK_W / 2}
            y={0}
            width={BLACK_W}
            height={BLACK_H}
            rx={2.5}
            fill="#10243e"
          />
        );
      })}
    </svg>
  );
}
