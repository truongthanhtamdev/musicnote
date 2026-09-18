/**
 * Phát âm thanh ngay trong trình duyệt bằng Web Audio — không cần file nhạc.
 *
 * Tổng hợp tiếng chứ không tải mẫu âm: thư viện phải mở nhanh trên điện thoại
 * mạng yếu, mà mấy chục file WAV cho từng nốt từng hợp âm thì nặng vô lý so
 * với mục đích "nghe cho biết nốt này kêu thế nào". Tiếng tổng hợp không giống
 * đàn thật nhưng đúng cao độ, đủ để luyện tai và kiểm tra thế bấm.
 *
 * Trình duyệt chỉ cho phát tiếng sau một cử chỉ của người dùng, nên
 * AudioContext được tạo trễ ở lần bấm đầu tiên chứ không tạo khi tải trang.
 * Mọi hàm ở đây chỉ gọi từ sự kiện click — gọi lúc render là im lặng.
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  // iOS treo context ở trạng thái suspended cho tới khi có cử chỉ; resume mỗi lần
  // rẻ và vô hại.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Có phát được tiếng trên máy này không — để ẩn nút nghe khi không hỗ trợ. */
export function audioSupported(): boolean {
  return typeof window !== "undefined" && !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
}

// ---------------------------------------------------------------------------
// Cao độ
// ---------------------------------------------------------------------------

/** Nửa cung của 7 nốt trắng tính từ Đô: Đô Rê Mi Fa Sol La Si. */
const DIATONIC_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

/** Bậc (theo lib/piano: Đô giữa = 0) → số nửa cung tính từ Đô giữa. */
export function stepToSemitone(step: number): number {
  const octave = Math.floor(step / 7);
  const idx = ((step % 7) + 7) % 7;
  return octave * 12 + DIATONIC_SEMITONES[idx];
}

/** Nửa cung tính từ Đô giữa (C4 = 261,63 Hz) → tần số. */
export function semitoneToFreq(semitone: number): number {
  return 261.6256 * Math.pow(2, semitone / 12);
}

/** Nốt MIDI → tần số. A4 = 69 = 440 Hz. */
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Dây buông guitar chuẩn, dây 6 → dây 1, theo số MIDI: E2 A2 D3 G3 B3 E4. */
const GUITAR_OPEN_MIDI = [40, 45, 50, 55, 59, 64];

// ---------------------------------------------------------------------------
// Tiếng
// ---------------------------------------------------------------------------

/**
 * Một tiếng đàn: hai dao động lệch nhau một chút cho dày, qua lọc thấp cho
 * bớt chói, bao hình tắt dần theo hàm mũ giống dây đàn.
 */
function pluck(
  ac: AudioContext,
  freq: number,
  at: number,
  opts: { duration: number; gain: number; brightness: number; type: OscillatorType }
) {
  const out = ac.createGain();
  out.gain.setValueAtTime(0, at);
  out.gain.linearRampToValueAtTime(opts.gain, at + 0.008);
  out.gain.exponentialRampToValueAtTime(0.0008, at + opts.duration);

  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(opts.brightness, at);
  // Tiếng đàn sáng lúc mới gảy rồi tối dần — nếu lọc đứng yên thì nghe như organ.
  filter.frequency.exponentialRampToValueAtTime(Math.max(300, opts.brightness / 5), at + opts.duration);

  for (const detune of [-4, 4]) {
    const osc = ac.createOscillator();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(freq, at);
    osc.detune.setValueAtTime(detune, at);
    osc.connect(filter);
    osc.start(at);
    osc.stop(at + opts.duration + 0.05);
  }
  filter.connect(out);
  out.connect(ac.destination);
}

/** Một nốt piano, theo bậc tính từ Đô giữa. */
export function playPianoStep(step: number, duration = 1.4) {
  const ac = getContext();
  if (!ac) return;
  pluck(ac, semitoneToFreq(stepToSemitone(step)), ac.currentTime, {
    duration,
    gain: 0.35,
    brightness: 2600,
    type: "triangle",
  });
}

/** Nhiều nốt piano cùng lúc (hợp âm). */
export function playPianoChord(steps: number[], duration = 1.8) {
  const ac = getContext();
  if (!ac) return;
  const t = ac.currentTime;
  // Lệch nhau vài mili giây như tay người bấm, nghe tự nhiên hơn bấm máy.
  steps.forEach((s, i) =>
    pluck(ac, semitoneToFreq(stepToSemitone(s)), t + i * 0.012, {
      duration,
      gain: 0.28,
      brightness: 2400,
      type: "triangle",
    })
  );
}

/**
 * Hợp âm guitar từ thế bấm (6 số, dây 6 → dây 1, -1 là không đánh).
 * "strum" quạt xuống một nhát; "arpeggio" rải từng dây.
 */
export function playGuitarChord(frets: number[], style: "strum" | "arpeggio" = "strum") {
  const ac = getContext();
  if (!ac) return;
  const t = ac.currentTime;
  const gap = style === "strum" ? 0.035 : 0.22;
  let n = 0;
  frets.forEach((fret, i) => {
    if (fret < 0) return;
    pluck(ac, midiToFreq(GUITAR_OPEN_MIDI[i] + fret), t + n * gap, {
      duration: style === "strum" ? 2.2 : 1.6,
      gain: 0.22,
      brightness: 3200,
      type: "sawtooth",
    });
    n++;
  });
}

/**
 * Tiếng gõ nhịp: xung ngắn, phách nhấn cao hơn và to hơn. Nhận `at` theo đồng
 * hồ của AudioContext để máy đếm nhịp lên lịch trước — setTimeout không đủ
 * đều cho việc này.
 */
export function scheduleClick(at: number, accent: boolean) {
  const ac = getContext();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(accent ? 1400 : 1000, at);
  g.gain.setValueAtTime(accent ? 0.5 : 0.3, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(at);
  osc.stop(at + 0.06);
}

/** Thời gian hiện tại của AudioContext, để lên lịch nhịp. */
export function audioNow(): number | null {
  const ac = getContext();
  return ac ? ac.currentTime : null;
}
