/**
 * Hợp âm piano cho người mới đệm hát, tông Đô trưởng.
 *
 * Cố ý chỉ lấy tông Đô: bảy hợp âm của tông này toàn phím trắng, người mới
 * bấm được ngay trong buổi đầu. Bấm quen rồi chuyển tông bằng cách dời cả
 * bàn tay là chuyện của buổi sau.
 *
 * `steps` theo quy ước lib/piano: Đô giữa = 0. Tay phải bấm ba nốt này, tay
 * trái đánh nốt gốc thấp hơn một quãng tám (`bass`).
 */
export interface PianoChord {
  name: string;
  fullName: string;
  /** Bậc trong tông (1–7), để ghép vào vòng hòa thanh. */
  degree: number;
  steps: number[];
  bass: number;
  noteNames: string;
}

const NAMES = ["Đô", "Rê", "Mi", "Fa", "Sol", "La", "Si"];
const name = (s: number) => NAMES[((s % 7) + 7) % 7];

function triad(root: number, extra?: number): number[] {
  const t = [root, root + 2, root + 4];
  return extra != null ? [...t, root + extra] : t;
}

function chord(nm: string, full: string, degree: number, root: number, extra?: number): PianoChord {
  const steps = triad(root, extra);
  return { name: nm, fullName: full, degree, steps, bass: root - 7, noteNames: steps.map(name).join(" – ") };
}

export const PIANO_CHORDS: PianoChord[] = [
  chord("C", "Đô trưởng", 1, 0),
  chord("Dm", "Rê thứ", 2, 1),
  chord("Em", "Mi thứ", 3, 2),
  chord("F", "Fa trưởng", 4, 3),
  chord("G", "Sol trưởng", 5, 4),
  chord("Am", "La thứ", 6, 5),
  chord("G7", "Sol bảy", 5, 4, 6),
];

export const PIANO_CHORD_BY_NAME = new Map(PIANO_CHORDS.map((c) => [c.name, c]));

/** Vài vòng hay dùng nhất, ghi theo tên hợp âm tông Đô để bấm theo được ngay. */
export const PIANO_PROGRESSIONS: { name: string; chords: string[]; feel: string }[] = [
  { name: "1 – 5 – 6 – 4", chords: ["C", "G", "Am", "F"], feel: "Vòng nhạc trẻ kinh điển" },
  { name: "1 – 6 – 4 – 5", chords: ["C", "Am", "F", "G"], feel: "Nhạc xưa, ấm và quen tai" },
  { name: "6 – 4 – 1 – 5", chords: ["Am", "F", "C", "G"], feel: "Bắt đầu từ thứ, man mác" },
  { name: "1 – 4 – 5 – 1", chords: ["C", "F", "G7", "C"], feel: "Ba hợp âm gốc, có G7 dẫn về" },
];
