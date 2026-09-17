/**
 * Điệu đệm guitar: cách tay phải quạt hoặc rải cho từng điệu.
 *
 * Thiếu phần này thì thư viện hợp âm chỉ dùng để tra cứu — người học thuộc
 * hết hợp âm vẫn không đệm nổi bài nào, vì không biết tay phải làm gì.
 *
 * Quy ước ghi: mỗi điệu chia thành các ô đều nhau theo phách. Ô nào có nhát
 * đàn thì ghi loại nhát, ô trống là nghỉ. Ghi theo ô đều như vậy để vẽ ra
 * lưới nhìn là đếm được, thay vì mô tả bằng lời "chát bùm chát chát".
 */

/** 1 = dây mảnh nhất (Mi cao), 6 = dây to nhất (Mi trầm) — cách đánh số quen thuộc. */
export type GuitarString = 1 | 2 | 3 | 4 | 5 | 6;

export type StrumKind =
  /** Đánh dây trầm của hợp âm. */
  | "bass"
  /** Quạt xuống, từ dây trầm về dây mảnh. */
  | "down"
  /** Quạt lên. */
  | "up"
  /** Chặn tiếng — tiếng "chát" khô. */
  | "mute"
  /** Khảy riêng một dây. */
  | "pluck"
  /** Nghỉ. */
  | "rest";

export interface StrumStep {
  kind: StrumKind;
  /** Chỉ dùng cho pluck. */
  string?: GuitarString;
  /** Nhát nhấn mạnh hơn phần còn lại. */
  accent?: boolean;
}

const r: StrumStep = { kind: "rest" };
const down = (accent = false): StrumStep => ({ kind: "down", accent });
const up = (): StrumStep => ({ kind: "up" });
const bass = (): StrumStep => ({ kind: "bass", accent: true });
const mute = (): StrumStep => ({ kind: "mute" });
const p = (string: GuitarString): StrumStep => ({ kind: "pluck", string });

export interface StrumPattern {
  id: string;
  name: string;
  /** Số phách mỗi ô nhịp. */
  beats: number;
  /** Số ô chia nhỏ trong mỗi phách. */
  perBeat: number;
  /** Dài đúng beats × perBeat. */
  steps: StrumStep[];
  /** Nhịp ghi trên bản nhạc. */
  meter: string;
  tempo: string;
  level: "Dễ" | "Vừa" | "Khó";
  hand: "Quạt" | "Rải";
  description: string;
  /** Kiểu bài hay dùng điệu này. */
  songs: string;
  tip: string;
}

/**
 * Sáu điệu phủ gần hết nhạc Việt phổ thông, xếp từ dễ tới khó.
 *
 * Mỗi điệu đều có nhiều biến thể tuỳ người dạy — đây là bản phổ biến nhất,
 * đủ để đệm được bài thật, chứ không phải bản duy nhất đúng.
 */
export const STRUM_PATTERNS: StrumPattern[] = [
  {
    id: "ballad-co-ban",
    name: "Ballad cơ bản",
    beats: 4,
    perBeat: 2,
    steps: [bass(), r, down(), r, down(), r, down(), r],
    meter: "4/4",
    tempo: "60–80",
    level: "Dễ",
    hand: "Quạt",
    description:
      "Một nhát bass rồi ba nhát quạt xuống đều đặn. Đây là điệu đầu tiên nên tập: chỉ cần giữ tay phải đều là đã đệm theo bài được.",
    songs: "Hầu hết nhạc trẻ chậm, nhạc sinh hoạt",
    tip: "Đừng quạt mạnh. Tay phải thả lỏng, chạm dây nhẹ thôi, giữ đều mới quan trọng.",
  },
  {
    id: "ballad",
    name: "Ballad đầy đủ",
    beats: 4,
    perBeat: 2,
    steps: [bass(), r, down(), up(), r, up(), down(), up()],
    meter: "4/4",
    tempo: "65–85",
    level: "Vừa",
    hand: "Quạt",
    description:
      "Bản đầy đủ của Ballad, thêm các nhát quạt lên xen kẽ nên nghe mềm và đầy hơn hẳn bản cơ bản.",
    songs: "Nhạc trẻ, ballad Việt, acoustic cover",
    tip: "Tay phải cứ đưa lên xuống đều không ngừng, ô nào nghỉ thì vung tay qua chứ đừng dừng lại — có vậy nhịp mới không vấp.",
  },
  {
    id: "valse",
    name: "Valse",
    beats: 3,
    perBeat: 2,
    steps: [bass(), r, down(), r, down(), r],
    meter: "3/4",
    tempo: "90–120",
    level: "Dễ",
    hand: "Quạt",
    description:
      "Nhịp 3: một bass rồi hai nhát quạt. Đếm 'một – hai – ba' đều nhau, nhấn vào phách một.",
    songs: "Nhạc thiếu nhi, nhạc trữ tình nhịp 3",
    tip: "Nhận ra bài nhịp 3 bằng cách hát và đếm: nếu đếm tới 3 là quay vòng thì dùng Valse, đếm tới 4 mới quay vòng thì dùng Ballad.",
  },
  {
    id: "slow-rock",
    name: "Slow Rock",
    beats: 6,
    perBeat: 1,
    steps: [bass(), p(3), p(2), p(1), p(2), p(3)],
    meter: "6/8",
    tempo: "60–75",
    level: "Vừa",
    hand: "Rải",
    description:
      "Rải sáu nốt lên rồi xuống trong một ô nhịp. Nghe day dứt, dập dềnh — chất riêng của nhạc trữ tình.",
    songs: "Nhạc trữ tình, nhạc vàng chậm",
    tip: "Ngón cái lo dây bass, ba ngón trỏ–giữa–áp út phụ trách dây 3–2–1. Mỗi ngón một dây cố định, đừng đổi.",
  },
  {
    id: "bolero",
    name: "Bolero",
    beats: 4,
    perBeat: 2,
    steps: [bass(), r, p(3), p(2), p(1), p(2), p(3), r],
    meter: "4/4",
    tempo: "60–80",
    level: "Vừa",
    hand: "Rải",
    description:
      "Bass ngân ra rồi rải chùm dây mảnh. Nhịp thong thả, để nhiều khoảng trống cho người hát.",
    songs: "Nhạc vàng, bolero, nhạc quê hương",
    tip: "Cái hồn của Bolero nằm ở chỗ chậm và có khoảng lặng. Đánh nhanh lên một chút là mất chất ngay.",
  },
  {
    id: "disco",
    name: "Disco / Fox",
    beats: 4,
    perBeat: 2,
    steps: [down(true), up(), mute(), up(), down(true), up(), mute(), up()],
    meter: "4/4",
    tempo: "110–140",
    level: "Khó",
    hand: "Quạt",
    description:
      "Quạt lên xuống liên tục, chen tiếng chặn khô ở phách 2 và 4 tạo nhịp nảy. Điệu sôi động nhất trong nhóm này.",
    songs: "Nhạc trẻ nhanh, nhạc sinh hoạt tập thể",
    tip: "Tiếng chặn tạo bằng cách hạ cạnh bàn tay phải lên dây ngay lúc quạt — nghe 'chát' khô chứ không ra cao độ.",
  },
];

/**
 * Dây bass của từng hợp âm — nhát "bass" đánh vào dây này chứ không phải
 * lúc nào cũng dây 6. Đánh sai dây bass là hợp âm nghe đục ngay.
 */
export const BASS_STRING: Record<string, GuitarString> = {
  E: 6, Em: 6, E7: 6, Em7: 6, G: 6, G7: 6, F: 6, Fm: 6, "F#m": 6, "F#": 6, Gm: 6,
  A: 5, Am: 5, A7: 5, Am7: 5, C: 5, C7: 5, Cmaj7: 5, B: 5, Bm: 5, B7: 5, Bb: 5, "C#m": 5,
  D: 4, Dm: 4, D7: 4, Dm7: 4,
};

/** Dây bass của một hợp âm, mặc định dây 6 cho hợp âm lạ. */
export function bassStringOf(chord: string): GuitarString {
  return BASS_STRING[chord] ?? 6;
}

/** Nhãn phách hiện trên lưới: 1, &, 2, &... hoặc 1..6 cho nhịp 6/8. */
export function beatLabels(pattern: StrumPattern): string[] {
  const labels: string[] = [];
  for (let b = 0; b < pattern.beats; b++) {
    for (let s = 0; s < pattern.perBeat; s++) {
      labels.push(s === 0 ? String(b + 1) : "&");
    }
  }
  return labels;
}
