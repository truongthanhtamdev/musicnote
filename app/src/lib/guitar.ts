/**
 * Dữ liệu cho thư viện guitar ở trang /guitar: thế bấm hợp âm và các vòng
 * hòa thanh thường dùng khi đệm hát.
 *
 * Để thẳng trong code chứ không nhét vào cơ sở dữ liệu: đây là kiến thức nhạc
 * lý cố định, không phải dữ liệu vận hành của trung tâm — sửa một hợp âm là
 * sửa code rồi deploy, không cần màn hình quản trị cho nó.
 */

export interface ChordShape {
  name: string;
  /** Tên đầy đủ đọc cho người mới. */
  fullName: string;
  group: ChordGroup;
  /**
   * Ngăn bấm trên 6 dây, từ dây 6 (Mi trầm) tới dây 1 (Mi cao).
   * -1 = không đánh dây này, 0 = buông.
   */
  frets: number[];
  /** Ngón tay tương ứng (1 trỏ … 4 út), 0 = không bấm. */
  fingers: number[];
  /** Hợp âm chặn: chặn ở ngăn này, từ dây `from` tới dây 1. */
  barre?: { fret: number; from: number };
  /** Ngăn đầu tiên vẽ trên hình, dùng cho hợp âm nằm cao trên cần đàn. */
  baseFret?: number;
  /** Mẹo bấm cho người mới. */
  tip?: string;
}

export type ChordGroup = "major" | "minor" | "seventh" | "barre" | "color";

export const CHORD_GROUPS: { value: ChordGroup; label: string; hint: string }[] = [
  { value: "major", label: "Hợp âm trưởng", hint: "Nghe tươi sáng — học trước tiên" },
  { value: "minor", label: "Hợp âm thứ", hint: "Nghe buồn, dùng cực nhiều trong ballad" },
  { value: "seventh", label: "Hợp âm 7", hint: "Tạo cảm giác lửng, dẫn về hợp âm sau" },
  { value: "barre", label: "Hợp âm chặn", hint: "Khó hơn, nhưng mở ra mọi tông" },
  { value: "color", label: "Hợp âm màu", hint: "sus, add9 — rải cho bài đỡ đơn điệu" },
];

/** Thế bấm chuẩn, dây 6 (Mi trầm) → dây 1 (Mi cao). */
export const CHORDS: ChordShape[] = [
  // --- Trưởng ---
  {
    name: "C",
    fullName: "Đô trưởng",
    group: "major",
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [0, 3, 2, 0, 1, 0],
    tip: "Không đánh dây 6. Cong ngón cho dây buông kêu rõ.",
  },
  {
    name: "G",
    fullName: "Sol trưởng",
    group: "major",
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, 0, 0, 0, 4],
    tip: "Đủ 6 dây. Dùng ngón 2–1–4 để đổi sang C và D nhanh hơn.",
  },
  {
    name: "D",
    fullName: "Rê trưởng",
    group: "major",
    frets: [-1, -1, 0, 2, 3, 2],
    fingers: [0, 0, 0, 1, 3, 2],
    tip: "Chỉ đánh 4 dây mỏng. Ba ngón xếp thành hình tam giác.",
  },
  {
    name: "A",
    fullName: "La trưởng",
    group: "major",
    frets: [-1, 0, 2, 2, 2, 0],
    fingers: [0, 0, 1, 2, 3, 0],
    tip: "Ba ngón cùng ngăn 2 — hơi chật, ép sát nhau là được.",
  },
  {
    name: "E",
    fullName: "Mi trưởng",
    group: "major",
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [0, 2, 3, 1, 0, 0],
    tip: "Đủ 6 dây, dày tiếng nhất trong các hợp âm mở.",
  },

  // --- Thứ ---
  {
    name: "Am",
    fullName: "La thứ",
    group: "minor",
    frets: [-1, 0, 2, 2, 1, 0],
    fingers: [0, 0, 2, 3, 1, 0],
    tip: "Giống hệt E nhưng dịch sang một dây — học E rồi là bấm được ngay.",
  },
  {
    name: "Em",
    fullName: "Mi thứ",
    group: "minor",
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0],
    tip: "Dễ nhất: chỉ hai ngón. Hợp âm đầu tiên nên tập.",
  },
  {
    name: "Dm",
    fullName: "Rê thứ",
    group: "minor",
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: [0, 0, 0, 2, 3, 1],
    tip: "Chỉ đánh 4 dây mỏng, ngón út không dùng.",
  },

  // --- Hợp âm 7 ---
  {
    name: "G7",
    fullName: "Sol bảy",
    group: "seventh",
    frets: [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, 0, 0, 0, 1],
    tip: "Từ G chỉ cần đổi ngón ở dây 1 — hay dùng để về C.",
  },
  {
    name: "E7",
    fullName: "Mi bảy",
    group: "seventh",
    frets: [0, 2, 0, 1, 0, 0],
    fingers: [0, 2, 0, 1, 0, 0],
    tip: "Từ E nhấc một ngón ra là xong.",
  },
  {
    name: "A7",
    fullName: "La bảy",
    group: "seventh",
    frets: [-1, 0, 2, 0, 2, 0],
    fingers: [0, 0, 2, 0, 3, 0],
    tip: "Từ A nhấc ngón giữa. Rất hay dùng để dẫn về D.",
  },
  {
    name: "D7",
    fullName: "Rê bảy",
    group: "seventh",
    frets: [-1, -1, 0, 2, 1, 2],
    fingers: [0, 0, 0, 2, 1, 3],
    tip: "Dẫn về G rất mượt.",
  },
  {
    name: "B7",
    fullName: "Si bảy",
    group: "seventh",
    frets: [-1, 2, 1, 2, 0, 2],
    fingers: [0, 2, 1, 3, 0, 4],
    tip: "Dùng thay Bdim/B trong tông Em — dẫn về Em rất ngọt.",
  },
  {
    name: "Am7",
    fullName: "La thứ bảy",
    group: "seventh",
    frets: [-1, 0, 2, 0, 1, 0],
    fingers: [0, 0, 2, 0, 1, 0],
    tip: "Từ Am nhấc một ngón — nghe nhẹ và mềm hơn.",
  },
  {
    name: "Em7",
    fullName: "Mi thứ bảy",
    group: "seventh",
    frets: [0, 2, 2, 0, 3, 0],
    fingers: [0, 1, 2, 0, 3, 0],
    tip: "Rải thay cho Em khi đoạn nhạc lặp lâu.",
  },
  {
    name: "Dm7",
    fullName: "Rê thứ bảy",
    group: "seventh",
    frets: [-1, -1, 0, 2, 1, 1],
    fingers: [0, 0, 0, 2, 1, 1],
    tip: "Ngón trỏ chặn nhẹ hai dây 1–2.",
  },

  // --- Hợp âm chặn ---
  {
    name: "F",
    fullName: "Fa trưởng (chặn ngăn 1)",
    group: "barre",
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    barre: { fret: 1, from: 6 },
    tip: "Ải đầu tiên của người học. Chưa chặn nổi thì bấm tạm 4 dây mỏng (Fmaj7).",
  },
  {
    name: "Bm",
    fullName: "Si thứ (chặn ngăn 2)",
    group: "barre",
    frets: [-1, 2, 4, 4, 3, 2],
    fingers: [0, 1, 3, 4, 2, 1],
    barre: { fret: 2, from: 5 },
    tip: "Chặn từ dây 5, không đánh dây 6.",
  },
  {
    name: "F#m",
    fullName: "Fa thăng thứ (chặn ngăn 2)",
    group: "barre",
    frets: [2, 4, 4, 2, 2, 2],
    fingers: [1, 3, 4, 1, 1, 1],
    barre: { fret: 2, from: 6 },
    tip: "Chính là thế Em dời lên ngăn 2 và chặn lại.",
  },
  {
    name: "Bb",
    fullName: "Si giáng trưởng (chặn ngăn 1)",
    group: "barre",
    frets: [-1, 1, 3, 3, 3, 1],
    fingers: [0, 1, 2, 3, 4, 1],
    barre: { fret: 1, from: 5 },
    tip: "Thế A dời lên ngăn 1. Hay gặp trong tông Fa và Rê thứ.",
  },
  {
    name: "Gm",
    fullName: "Sol thứ (chặn ngăn 3)",
    group: "barre",
    frets: [3, 5, 5, 3, 3, 3],
    fingers: [1, 3, 4, 1, 1, 1],
    barre: { fret: 3, from: 6 },
    tip: "Thế Em dời lên ngăn 3.",
  },
  {
    name: "Cm",
    fullName: "Đô thứ (chặn ngăn 3)",
    group: "barre",
    frets: [-1, 3, 5, 5, 4, 3],
    fingers: [0, 1, 3, 4, 2, 1],
    barre: { fret: 3, from: 5 },
    tip: "Thế Am dời lên ngăn 3.",
  },
  {
    name: "C#m",
    fullName: "Đô thăng thứ (chặn ngăn 4)",
    group: "barre",
    frets: [-1, 4, 6, 6, 5, 4],
    fingers: [0, 1, 3, 4, 2, 1],
    barre: { fret: 4, from: 5 },
    baseFret: 4,
    tip: "Thế Am dời lên ngăn 4 — hay gặp trong tông La và Mi.",
  },
  {
    name: "G#m",
    fullName: "Sol thăng thứ (chặn ngăn 4)",
    group: "barre",
    frets: [4, 6, 6, 4, 4, 4],
    fingers: [1, 3, 4, 1, 1, 1],
    barre: { fret: 4, from: 6 },
    baseFret: 4,
    tip: "Thế Em dời lên ngăn 4.",
  },
  {
    name: "B",
    fullName: "Si trưởng (chặn ngăn 2)",
    group: "barre",
    frets: [-1, 2, 4, 4, 4, 2],
    fingers: [0, 1, 2, 3, 4, 1],
    barre: { fret: 2, from: 5 },
    tip: "Thế A dời lên ngăn 2. Người mới hay thay tạm bằng B7.",
  },

  // --- Hợp âm màu ---
  {
    name: "Fmaj7",
    fullName: "Fa trưởng bảy",
    group: "color",
    frets: [-1, -1, 3, 2, 1, 0],
    fingers: [0, 0, 3, 2, 1, 0],
    tip: "Cứu cánh khi chưa chặn được F — chỉ 4 dây mỏng, nghe vẫn hợp.",
  },
  {
    name: "Cadd9",
    fullName: "Đô thêm bậc 9",
    group: "color",
    frets: [-1, 3, 2, 0, 3, 0],
    fingers: [0, 2, 1, 0, 3, 0],
    tip: "Thay cho C khi rải — nghe rộng và hiện đại hơn.",
  },
  {
    name: "Dsus2",
    fullName: "Rê treo bậc 2",
    group: "color",
    frets: [-1, -1, 0, 2, 3, 0],
    fingers: [0, 0, 0, 1, 2, 0],
    tip: "Từ D nhấc ngón ở dây 1.",
  },
  {
    name: "Dsus4",
    fullName: "Rê treo bậc 4",
    group: "color",
    frets: [-1, -1, 0, 2, 3, 3],
    fingers: [0, 0, 0, 1, 2, 3],
    tip: "Thêm một ngón vào D. Đánh Dsus4 rồi về D nghe rất đã.",
  },
  {
    name: "Asus2",
    fullName: "La treo bậc 2",
    group: "color",
    frets: [-1, 0, 2, 2, 0, 0],
    fingers: [0, 0, 1, 2, 0, 0],
    tip: "Từ A nhấc ngón ở dây 2.",
  },
  {
    name: "Asus4",
    fullName: "La treo bậc 4",
    group: "color",
    frets: [-1, 0, 2, 2, 3, 0],
    fingers: [0, 0, 1, 2, 3, 0],
    tip: "Thêm ngón vào A, rồi thả về A.",
  },
  {
    name: "Esus4",
    fullName: "Mi treo bậc 4",
    group: "color",
    frets: [0, 2, 2, 2, 0, 0],
    fingers: [0, 1, 2, 3, 0, 0],
    tip: "Từ E thêm một ngón ở dây 3.",
  },
];

export const CHORD_BY_NAME = new Map(CHORDS.map((c) => [c.name, c]));

/* --------------------------------- Tông --------------------------------- */

export interface KeyInfo {
  name: string;
  label: string;
  mode: "major" | "minor";
  /** 7 hợp âm của tông, theo bậc I…VII (hoặc i…VII với tông thứ). */
  chords: string[];
}

/**
 * Bảy hợp âm của mỗi tông, viết thẳng ra thay vì tính bằng công thức — tính
 * máy móc rất dễ ra tên trùng âm khó đọc (VD "E#" thay vì "F"), mà bảng này
 * chỉ có mười tông người mới hay dùng.
 */
export const KEYS: KeyInfo[] = [
  { name: "C", label: "Đô trưởng (C)", mode: "major", chords: ["C", "Dm", "Em", "F", "G", "Am", "Bdim"] },
  { name: "G", label: "Sol trưởng (G)", mode: "major", chords: ["G", "Am", "Bm", "C", "D", "Em", "F#dim"] },
  { name: "D", label: "Rê trưởng (D)", mode: "major", chords: ["D", "Em", "F#m", "G", "A", "Bm", "C#dim"] },
  { name: "A", label: "La trưởng (A)", mode: "major", chords: ["A", "Bm", "C#m", "D", "E", "F#m", "G#dim"] },
  { name: "E", label: "Mi trưởng (E)", mode: "major", chords: ["E", "F#m", "G#m", "A", "B", "C#m", "D#dim"] },
  { name: "F", label: "Fa trưởng (F)", mode: "major", chords: ["F", "Gm", "Am", "Bb", "C", "Dm", "Edim"] },
  { name: "Am", label: "La thứ (Am)", mode: "minor", chords: ["Am", "Bdim", "C", "Dm", "Em", "F", "G"] },
  { name: "Em", label: "Mi thứ (Em)", mode: "minor", chords: ["Em", "F#dim", "G", "Am", "Bm", "C", "D"] },
  { name: "Dm", label: "Rê thứ (Dm)", mode: "minor", chords: ["Dm", "Edim", "F", "Gm", "Am", "Bb", "C"] },
  { name: "Bm", label: "Si thứ (Bm)", mode: "minor", chords: ["Bm", "C#dim", "D", "Em", "F#m", "G", "A"] },
];

export const KEY_BY_NAME = new Map(KEYS.map((k) => [k.name, k]));

/* ---------------------------- Vòng hòa thanh ---------------------------- */

export interface Progression {
  id: string;
  name: string;
  /** Bậc theo số, VD [1, 5, 6, 4]. */
  degrees: number[];
  mode: "major" | "minor";
  description: string;
  feel: string;
}

/**
 * Vòng hòa thanh viết theo BẬC chứ không theo tên hợp âm, để đổi tông là ra
 * ngay bộ hợp âm mới — đúng cách người đệm hát nghĩ: "vòng 1-5-6-4 tông Sol".
 */
export const PROGRESSIONS: Progression[] = [
  {
    id: "1564",
    name: "1 – 5 – 6 – 4",
    degrees: [1, 5, 6, 4],
    mode: "major",
    description: "Vòng bốn hợp âm nổi tiếng nhất, hàng trăm bài nhạc trẻ dùng đúng vòng này.",
    feel: "Tươi sáng, dễ hát theo",
  },
  {
    id: "6415",
    name: "6 – 4 – 1 – 5",
    degrees: [6, 4, 1, 5],
    mode: "major",
    description: "Cũng bốn hợp âm đó nhưng bắt đầu từ hợp âm thứ, nghe da diết hơn hẳn.",
    feel: "Man mác, hợp ballad",
  },
  {
    id: "1645",
    name: "1 – 6 – 4 – 5",
    degrees: [1, 6, 4, 5],
    mode: "major",
    description: "Vòng kinh điển của nhạc xưa, nghe là thấy chất bolero và nhạc vàng.",
    feel: "Cổ điển, ấm",
  },
  {
    id: "145",
    name: "1 – 4 – 5",
    degrees: [1, 4, 5],
    mode: "major",
    description: "Ba hợp âm gốc của mọi tông. Tập vòng này trước khi tập gì khác.",
    feel: "Chắc chắn, vui",
  },
  {
    id: "251",
    name: "2 – 5 – 1",
    degrees: [2, 5, 1],
    mode: "major",
    description: "Đường về chủ âm mượt nhất. Thêm hợp âm 7 vào bậc 5 là nghe rất jazz.",
    feel: "Mượt, sang",
  },
  {
    id: "canon",
    name: "Vòng Canon",
    degrees: [1, 5, 6, 3, 4, 1, 4, 5],
    mode: "major",
    description: "Từ bản Canon in D của Pachelbel, đệm bài nào cũng hợp nên được dùng đi dùng lại.",
    feel: "Trong trẻo, chảy trôi",
  },
  {
    id: "1625",
    name: "1 – 6 – 2 – 5",
    degrees: [1, 6, 2, 5],
    mode: "major",
    description: "Vòng quay về chủ âm theo quãng năm, hay dùng cho đoạn điệp khúc quay lại.",
    feel: "Tròn trịa, dễ nối tiếp",
  },
  {
    id: "m-1674",
    name: "1 – 6 – 7 – 4 (tông thứ)",
    degrees: [1, 6, 7, 4],
    mode: "minor",
    description: "Đọc theo bậc của tông thứ: chủ âm buồn, rồi sáng dần ở hai bậc giữa.",
    feel: "Buồn nhưng không nặng",
  },
  {
    id: "m-145",
    name: "1 – 4 – 5 (tông thứ)",
    degrees: [1, 4, 5],
    mode: "minor",
    description: "Ba hợp âm gốc của tông thứ. Đổi bậc 5 thành hợp âm 7 trưởng nghe day dứt hơn.",
    feel: "Tối, cổ điển",
  },
];

/** Tên hợp âm của một vòng trong một tông cụ thể. */
export function chordsOfProgression(progression: Progression, key: KeyInfo): string[] {
  return progression.degrees.map((d) => key.chords[d - 1]);
}

/**
 * Hợp âm bậc 5 của tông thứ trong nhạc thực tế hay được đổi thành hợp âm 7
 * trưởng (Em → B7) cho câu nhạc dẫn về chủ âm dứt khoát hơn.
 */
export const MINOR_DOMINANT_SWAP: Record<string, string> = {
  Am: "E7",
  Em: "B7",
  Dm: "A7",
  Bm: "F#7",
};
