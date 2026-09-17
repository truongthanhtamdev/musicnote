import { CLEFS, type ClefName } from "@/lib/piano";

const LINE_GAP = 14;
const STEP = LINE_GAP / 2;
const LEFT = 58;
const RIGHT_PAD = 30;
const TOP = 28;

/**
 * Khuông nhạc 5 dòng với một nốt tròn.
 *
 * Dấu khóa vẽ bằng chính cái mẹo đang dạy — vòng tròn ôm dòng Sol, hai chấm
 * kẹp dòng Fa — thay vì vẽ ký hiệu khóa cho đẹp: người mới nhìn vào là thấy
 * ngay "à, khóa chỉ vào dòng này". Vẽ hình thật của khóa bằng SVG thì hoặc
 * xấu, hoặc phải nhúng font nhạc nặng mà máy khách chưa chắc có.
 */
export function MusicStaff({
  clef,
  step,
  width = 260,
  highlight,
}: {
  clef: ClefName;
  /** Bậc so với Đô giữa; null = chỉ vẽ khuông trống. */
  step?: number | null;
  width?: number;
  /** Tô màu nốt: đúng/sai trong game. */
  highlight?: "right" | "wrong";
}) {
  const info = CLEFS[clef];
  const height = TOP * 2 + LINE_GAP * 4;
  const lineY = (line: number) => TOP + (5 - line) * LINE_GAP; // line 1 = dưới cùng
  const stepY = (s: number) => lineY(1) - (s - info.bottomLineStep) * STEP;

  const noteX = LEFT + (width - LEFT - RIGHT_PAD) / 2;
  const noteY = step == null ? 0 : stepY(step);

  // Dòng kẻ phụ: chỉ vẽ ở những bậc chẵn (vị trí của dòng) nằm ngoài khuông, và
  // chỉ về phía có nốt — nốt trên khuông thì không kẻ thêm gì ở dưới.
  const topLineStep = info.bottomLineStep + 8;
  const ledgers: number[] = [];
  if (step != null) {
    for (let s = info.bottomLineStep - 2; s >= step; s -= 2) ledgers.push(s);
    for (let s = topLineStep + 2; s <= step; s += 2) ledgers.push(s);
  }

  // Đuôi nốt: nốt từ dòng giữa trở lên quay đuôi xuống bên trái, dưới thì quay
  // lên bên phải — đúng như bản nhạc thật, để người học quen mắt ngay.
  const stemDown = step != null && step > info.bottomLineStep + 4;

  const noteFill =
    highlight === "right" ? "#16a34a" : highlight === "wrong" ? "#dc2626" : "#10243e";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={
        step == null ? `Khuông nhạc ${info.label}` : `Một nốt trên khuông ${info.label}`
      }
      className="max-w-full"
    >
      {/* 5 dòng kẻ */}
      {[1, 2, 3, 4, 5].map((l) => (
        <line
          key={l}
          x1={10}
          y1={lineY(l)}
          x2={width - 10}
          y2={lineY(l)}
          stroke="#334155"
          strokeWidth={1.2}
        />
      ))}

      {/* Dấu nhận biết khóa */}
      {clef === "sol" ? (
        <>
          {/* Nền trắng để dòng kẻ không gạch ngang chữ — chữ bị gạch trông như
              chữ bỏ đi, mà đây lại đúng là chỗ cần nhìn nhất. */}
          <circle cx={30} cy={lineY(info.anchorLine)} r={11} fill="#fff" />
          <circle
            cx={30}
            cy={lineY(info.anchorLine)}
            r={11}
            fill="none"
            stroke="#b06a2c"
            strokeWidth={3}
          />
          <text x={30} y={lineY(info.anchorLine) + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#b06a2c">
            {info.anchorNote}
          </text>
        </>
      ) : (
        <>
          <rect x={22} y={lineY(info.anchorLine) - 9} width={40} height={18} fill="#fff" />
          <circle cx={30} cy={lineY(info.anchorLine) - 4} r={3.2} fill="#b06a2c" />
          <circle cx={30} cy={lineY(info.anchorLine) + 4} r={3.2} fill="#b06a2c" />
          <text x={40} y={lineY(info.anchorLine) + 4} fontSize={10} fontWeight={700} fill="#b06a2c">
            {info.anchorNote}
          </text>
        </>
      )}
      <text x={10} y={height - 6} fontSize={10} fontWeight={700} fill="#94a3b8">
        {info.label.toUpperCase()}
      </text>

      {/* Dòng kẻ phụ cho nốt nằm ngoài khuông */}
      {ledgers.map((s) => (
        <line
          key={`l${s}`}
          x1={noteX - 16}
          y1={stepY(s)}
          x2={noteX + 16}
          y2={stepY(s)}
          stroke="#334155"
          strokeWidth={1.2}
        />
      ))}

      {/* Nốt tròn + đuôi */}
      {step != null && (
        <g>
          <ellipse cx={noteX} cy={noteY} rx={9} ry={7} fill={noteFill} transform={`rotate(-20 ${noteX} ${noteY})`} />
          <line
            x1={stemDown ? noteX - 8.5 : noteX + 8.5}
            y1={stemDown ? noteY + 1 : noteY - 1}
            x2={stemDown ? noteX - 8.5 : noteX + 8.5}
            y2={stemDown ? noteY + 34 : noteY - 34}
            stroke={noteFill}
            strokeWidth={2}
          />
        </g>
      )}
    </svg>
  );
}
