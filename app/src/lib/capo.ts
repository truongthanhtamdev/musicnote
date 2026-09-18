/**
 * Capo: kẹp ở ngăn N thì mọi thế bấm đều lên N nửa cung.
 *
 * Người đệm hát Việt sống nhờ capo: bài tông Mi giáng thì không ai bấm Mi
 * giáng chặn cả bài, người ta kẹp ngăn 1 rồi bấm thế Rê. Bảng này trả lời
 * đúng câu đó theo cả hai chiều.
 */

/** 12 tông theo vòng nửa cung, ưu tiên tên có dấu giáng cho tông hay gặp. */
export const CHROMATIC = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;

/** Thế bấm mở dễ, cái mà người mới thực sự bấm được. */
export const OPEN_SHAPES = ["C", "D", "E", "G", "A", "Am", "Em", "Dm"] as const;

export const MAX_CAPO = 7;

function indexOf(root: string): number {
  const alias: Record<string, string> = { "C#": "Db", "D#": "Eb", Gb: "F#", "G#": "Ab", "A#": "Bb" };
  const r = alias[root] ?? root;
  return CHROMATIC.indexOf(r as (typeof CHROMATIC)[number]);
}

function splitShape(shape: string): { root: string; suffix: string } {
  const m = shape.match(/^([A-G][b#]?)(.*)$/);
  return m ? { root: m[1], suffix: m[2] } : { root: shape, suffix: "" };
}

/** Bấm thế `shape` với capo ở ngăn `fret` thì ra tông gì. */
export function soundingChord(shape: string, fret: number): string {
  const { root, suffix } = splitShape(shape);
  const i = indexOf(root);
  if (i < 0) return shape;
  return CHROMATIC[(i + fret) % 12] + suffix;
}

/**
 * Muốn ra tông `target` mà bấm thế `shape` thì capo ngăn mấy. Trả null nếu
 * phải kẹp cao quá MAX_CAPO — lúc đó nên đổi thế bấm khác.
 */
export function capoFor(shape: string, target: string): number | null {
  const a = indexOf(splitShape(shape).root);
  const b = indexOf(splitShape(target).root);
  if (a < 0 || b < 0) return null;
  const fret = (b - a + 12) % 12;
  return fret <= MAX_CAPO ? fret : null;
}

/** Tên tông đầy đủ để hiện cho người mới. */
export function keyLabel(k: string): string {
  const names: Record<string, string> = {
    C: "Đô", Db: "Rê giáng", D: "Rê", Eb: "Mi giáng", E: "Mi", F: "Fa",
    "F#": "Fa thăng", G: "Sol", Ab: "La giáng", A: "La", Bb: "Si giáng", B: "Si",
  };
  const { root, suffix } = splitShape(k);
  return `${names[root] ?? root}${suffix === "m" ? " thứ" : suffix ? " " + suffix : " trưởng"}`;
}
