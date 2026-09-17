/**
 * Dữ liệu cho thư viện piano ở /piano: vị trí nốt trên khuông nhạc, mẹo nhớ
 * và bộ câu hỏi cho game đọc nốt.
 *
 * Quy ước vị trí: `step` là số bậc tính từ nốt Đô giữa (C4 = 0), lên một nốt
 * là +1, xuống một nốt là −1. Một bậc trên khuông đúng bằng nửa khoảng cách
 * giữa hai dòng kẻ, nên từ `step` vẽ thẳng ra tọa độ mà không cần bảng tra.
 */

/** Tên nốt theo cách đọc của người Việt, xếp theo vòng 7 nốt. */
export const NOTE_NAMES = ["Đô", "Rê", "Mi", "Fa", "Sol", "La", "Si"] as const;
export type NoteName = (typeof NOTE_NAMES)[number];

/** Tên nốt của một bậc bất kỳ — chia lấy dư 7, kể cả bậc âm. */
export function noteNameOfStep(step: number): NoteName {
  return NOTE_NAMES[((step % 7) + 7) % 7];
}

/** Quãng tám (octave) để phân biệt Đô giữa với Đô cao: C4 = 4. */
export function octaveOfStep(step: number): number {
  return 4 + Math.floor(step / 7);
}

export function noteLabel(step: number): string {
  return `${noteNameOfStep(step)}${octaveOfStep(step)}`;
}

export type ClefName = "sol" | "fa";

export interface ClefInfo {
  name: ClefName;
  label: string;
  fullLabel: string;
  /** Bậc của dòng kẻ dưới cùng. */
  bottomLineStep: number;
  /** Dòng kẻ mà khóa "chỉ" vào (1 = dòng dưới cùng) và tên nốt của dòng đó. */
  anchorLine: number;
  anchorNote: string;
  /** Khoảng nốt dùng cho game, tính cả một chút dòng kẻ phụ. */
  gameRange: { from: number; to: number };
  lines: string[];
  spaces: string[];
  mnemonicLines: string;
  mnemonicSpaces: string;
}

export const CLEFS: Record<ClefName, ClefInfo> = {
  sol: {
    name: "sol",
    label: "Khóa Sol",
    fullLabel: "Khóa Sol (tay phải)",
    // Dòng dưới cùng là Mi3 quãng tám thứ 4 → cách Đô giữa 2 bậc.
    bottomLineStep: 2,
    anchorLine: 2,
    anchorNote: "Sol",
    // Từ Đô giữa (dòng kẻ phụ dưới) tới La trên khuông một chút.
    gameRange: { from: 0, to: 12 },
    lines: ["Mi", "Sol", "Si", "Rê", "Fa"],
    spaces: ["Fa", "La", "Đô", "Mi"],
    mnemonicLines: "Mi – Sol – Si – Rê – Fa",
    mnemonicSpaces: "Fa – La – Đô – Mi",
  },
  fa: {
    name: "fa",
    label: "Khóa Fa",
    fullLabel: "Khóa Fa (tay trái)",
    // Dòng dưới cùng là Sol2 → thấp hơn Đô giữa 10 bậc.
    bottomLineStep: -10,
    anchorLine: 4,
    anchorNote: "Fa",
    gameRange: { from: -12, to: 0 },
    lines: ["Sol", "Si", "Rê", "Fa", "La"],
    spaces: ["La", "Đô", "Mi", "Sol"],
    mnemonicLines: "Sol – Si – Rê – Fa – La",
    mnemonicSpaces: "La – Đô – Mi – Sol",
  },
};

export interface MemoryTip {
  title: string;
  text: string;
}

/**
 * Mẹo nhớ. Cố ý đặt "hiểu vì sao khóa tên vậy" lên đầu: có một điểm neo chắc
 * chắn rồi đếm ra, nhanh và bền hơn học vẹt từng nốt một.
 */
export const MEMORY_TIPS: MemoryTip[] = [
  {
    title: "Tên khóa chính là nốt nó chỉ vào",
    text: "Khóa Sol xoắn vòng quanh dòng kẻ thứ 2 — nên dòng đó là nốt Sol. Khóa Fa có hai chấm kẹp dòng kẻ thứ 4 — dòng đó là nốt Fa. Nhớ đúng một nốt neo này, mọi nốt khác chỉ việc đếm lên hoặc xuống.",
  },
  {
    title: "Đô giữa là cây cầu nối hai khuông",
    text: "Cùng một nốt Đô giữa: nằm trên dòng kẻ phụ ngay DƯỚI khuông khóa Sol, và dòng kẻ phụ ngay TRÊN khuông khóa Fa. Thấy nốt nằm ở dòng phụ sát khuông là nghĩ tới Đô giữa trước.",
  },
  {
    title: "Học theo chuỗi, đừng học từng nốt",
    text: "Năm dòng kẻ khóa Sol đọc từ dưới lên: Mi – Sol – Si – Rê – Fa. Bốn khe: Fa – La – Đô – Mi. Đọc to hai chuỗi này mỗi ngày 5 lần, chỉ vài hôm là bật ra tự động.",
  },
  {
    title: "Khóa Fa cũng chỉ có hai chuỗi",
    text: "Dòng kẻ: Sol – Si – Rê – Fa – La. Khe: La – Đô – Mi – Sol. Để ý cả hai khóa đều nhảy cách một nốt — dòng rồi khe, dòng rồi khe, không có ngoại lệ nào.",
  },
  {
    title: "Đếm từ nốt neo, đừng đọc lại từ đầu",
    text: "Gặp nốt lạ thì tìm nốt neo gần nhất (Sol dòng 2, Fa dòng 4, hay Đô giữa) rồi đếm một hai bậc là ra. Đọc lại từ dòng dưới cùng mỗi lần sẽ mãi chậm.",
  },
  {
    title: "Mỗi ngày 5 phút hơn mỗi tuần 1 tiếng",
    text: "Đọc nốt là phản xạ, không phải kiến thức. Chơi game bên dưới 5 phút mỗi ngày, nhìn nốt là bật ra tên — lúc đó mới đàn theo bản nhạc được trôi chảy.",
  },
];

/** Danh sách bậc hợp lệ cho game, theo khóa người chơi chọn. */
export function gameSteps(clef: ClefName | "both"): number[] {
  const ranges = clef === "both" ? [CLEFS.sol, CLEFS.fa] : [CLEFS[clef]];
  const steps: number[] = [];
  for (const c of ranges) {
    for (let s = c.gameRange.from; s <= c.gameRange.to; s++) steps.push(s);
  }
  return steps;
}
