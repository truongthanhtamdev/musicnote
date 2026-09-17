import type { ChordShape } from "@/lib/guitar";

const PAD_X = 14;
const PAD_TOP = 26;
const STRING_GAP = 18;
const FRET_GAP = 22;
const FRET_COUNT = 5;
const WIDTH = PAD_X * 2 + STRING_GAP * 5;
const HEIGHT = PAD_TOP + FRET_GAP * FRET_COUNT + 14;

/**
 * Hình thế bấm một hợp âm, vẽ đúng chiều người học nhìn vào cần đàn khi đàn
 * dựng đứng: dây 6 (Mi trầm) ở bên trái, ngăn 1 ở trên cùng.
 *
 * Vẽ bằng SVG chứ không dùng ảnh: nét luôn sắc trên mọi màn hình, đổi màu
 * theo giao diện được, và thêm hợp âm mới chỉ cần thêm dữ liệu.
 */
export function ChordDiagram({ chord, size = 1 }: { chord: ChordShape; size?: number }) {
  const base = chord.baseFret ?? 1;
  const stringX = (i: number) => PAD_X + i * STRING_GAP;
  const fretY = (f: number) => PAD_TOP + f * FRET_GAP;
  // Ngăn trên hình = ngăn thật trừ đi ngăn bắt đầu, để hợp âm nằm cao trên
  // cần đàn (VD chặn ngăn 4) vẫn vẽ vừa trong 5 ô.
  const dotY = (fret: number) => PAD_TOP + (fret - base + 0.5) * FRET_GAP;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH * size}
      height={HEIGHT * size}
      role="img"
      aria-label={`Thế bấm hợp âm ${chord.name}`}
      className="shrink-0"
    >
      {/* Lược đàn: ngăn 1 thì vẽ dày, còn lại ghi số ngăn bên cạnh */}
      {base === 1 ? (
        <rect x={PAD_X - 1} y={PAD_TOP - 4} width={STRING_GAP * 5 + 2} height={4} rx={1.5} fill="#1e3a5f" />
      ) : (
        <text x={PAD_X - 6} y={dotY(base) + 4} textAnchor="end" fontSize={11} fill="#64748b">
          {base}
        </text>
      )}

      {/* Ngăn */}
      {Array.from({ length: FRET_COUNT + 1 }, (_, f) => (
        <line
          key={`f${f}`}
          x1={PAD_X}
          y1={fretY(f)}
          x2={PAD_X + STRING_GAP * 5}
          y2={fretY(f)}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
      ))}

      {/* Dây */}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={`s${i}`}
          x1={stringX(i)}
          y1={fretY(0)}
          x2={stringX(i)}
          y2={fretY(FRET_COUNT)}
          stroke="#94a3b8"
          strokeWidth={1}
        />
      ))}

      {/* Dây buông (o) và dây không đánh (x) */}
      {chord.frets.map((fret, i) =>
        fret === 0 ? (
          <circle
            key={`o${i}`}
            cx={stringX(i)}
            cy={PAD_TOP - 12}
            r={4}
            fill="none"
            stroke="#1e3a5f"
            strokeWidth={1.5}
          />
        ) : fret === -1 ? (
          <g key={`x${i}`} stroke="#94a3b8" strokeWidth={1.6} strokeLinecap="round">
            <line x1={stringX(i) - 4} y1={PAD_TOP - 16} x2={stringX(i) + 4} y2={PAD_TOP - 8} />
            <line x1={stringX(i) + 4} y1={PAD_TOP - 16} x2={stringX(i) - 4} y2={PAD_TOP - 8} />
          </g>
        ) : null
      )}

      {/* Ngón chặn vẽ thành một thanh dài thay vì nhiều chấm rời */}
      {chord.barre && (
        <rect
          x={stringX(6 - chord.barre.from) - 7}
          y={dotY(chord.barre.fret) - 7}
          width={STRING_GAP * (chord.barre.from - 1) + 14}
          height={14}
          rx={7}
          fill="#b06a2c"
        />
      )}

      {/* Ngón bấm */}
      {chord.frets.map((fret, i) => {
        if (fret <= 0) return null;
        const onBarre = chord.barre && fret === chord.barre.fret && i >= 6 - chord.barre.from;
        if (onBarre) return null;
        return (
          <g key={`d${i}`}>
            <circle cx={stringX(i)} cy={dotY(fret)} r={7} fill="#b06a2c" />
            {chord.fingers[i] > 0 && (
              <text
                x={stringX(i)}
                y={dotY(fret) + 3.5}
                textAnchor="middle"
                fontSize={9}
                fontWeight={700}
                fill="#fff"
              >
                {chord.fingers[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
