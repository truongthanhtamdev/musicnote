/**
 * Phát âm thanh trong trình duyệt bằng Web Audio.
 *
 * Tiếng đàn là MẪU GHI TỪ ĐÀN THẬT (public/sounds, soundfont FluidR3_GM,
 * CC BY 3.0): mỗi nốt một file mp3 ~25KB, tải trễ khi cần và giữ lại trong
 * bộ nhớ, nên lần đầu bấm một nốt lạ có thể chậm một nhịp, các lần sau tức
 * thì. Tổng hợp bằng dao động thì nhẹ hơn nhưng không giống piano — đã thử,
 * người học nghe là biết ngay — nên chỉ giữ làm dự phòng khi không tải được
 * mẫu (mất mạng, hoặc máy chủ chưa có thư mục sounds).
 *
 * Trình duyệt chỉ cho phát tiếng sau một cử chỉ của người dùng: AudioContext
 * được tạo trễ và resume ở mỗi lần phát. Tải + giải mã mẫu thì làm được
 * trước cử chỉ, nên các component gọi warm*() lúc mount cho khỏi chờ.
 */

let ctx: AudioContext | null = null;

type Win = Window & { webkitAudioContext?: typeof AudioContext };

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as Win).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Gọi trước khi phát: iOS treo context ở trạng thái suspended tới khi có cử chỉ. */
function liveContext(): AudioContext | null {
  const ac = getContext();
  if (ac && ac.state === "suspended") void ac.resume();
  return ac;
}

/** Có phát được tiếng trên máy này không — để ẩn nút nghe khi không hỗ trợ. */
export function audioSupported(): boolean {
  return typeof window !== "undefined" && !!(window.AudioContext ?? (window as Win).webkitAudioContext);
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

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Tên file mẫu theo số MIDI, cùng quy ước với soundfont: C4 = 60, dấu giáng. */
const SAMPLE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
function sampleName(midi: number): string {
  return `${SAMPLE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** Dây buông guitar chuẩn, dây 6 → dây 1, theo số MIDI: E2 A2 D3 G3 B3 E4. */
const GUITAR_OPEN_MIDI = [40, 45, 50, 55, 59, 64];

// ---------------------------------------------------------------------------
// Mẫu tiếng thật
// ---------------------------------------------------------------------------

type Instrument = "piano" | "guitar";

/** Khoảng MIDI có file mẫu; ngoài khoảng này rơi về tiếng tổng hợp. */
const SAMPLE_RANGE: Record<Instrument, [number, number]> = {
  piano: [48, 84], // C3..C6
  guitar: [40, 76], // E2..E5
};

const buffers = new Map<string, Promise<AudioBuffer | null>>();

function loadSample(inst: Instrument, midi: number): Promise<AudioBuffer | null> {
  const key = `${inst}/${midi}`;
  const cached = buffers.get(key);
  if (cached) return cached;
  const ac = getContext();
  if (!ac) return Promise.resolve(null);
  const p = fetch(`/sounds/${inst}/${sampleName(midi)}.mp3`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((data) => ac.decodeAudioData(data))
    .catch(() => {
      // Tải hỏng thì đừng ghim lỗi mãi — xoá khỏi cache để lần sau thử lại.
      buffers.delete(key);
      return null;
    });
  buffers.set(key, p);
  return p;
}

function inRange(inst: Instrument, midi: number): boolean {
  const [lo, hi] = SAMPLE_RANGE[inst];
  return midi >= lo && midi <= hi;
}

/** Tải sẵn một dải nốt, gọi lúc component mount; gọi nhiều lần vô hại. */
function warm(inst: Instrument, from: number, to: number) {
  if (typeof window === "undefined") return;
  for (let m = from; m <= to; m++) if (inRange(inst, m)) void loadSample(inst, m);
}
export function warmPiano() {
  warm("piano", 48, 84);
}
export function warmGuitar() {
  warm("guitar", 40, 76);
}

/**
 * Phát một mẫu tại thời điểm `at`, nhả dần từ `duration` để nốt ngắn không
 * bị cắt cụt "phựt" mà cũng không ngân hết mấy giây của file.
 */
function playBuffer(ac: AudioContext, buf: AudioBuffer, at: number, gain: number, duration: number) {
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.setValueAtTime(gain, at + duration);
  g.gain.exponentialRampToValueAtTime(0.001, at + duration + 0.35);
  src.connect(g);
  g.connect(ac.destination);
  src.start(at);
  src.stop(at + duration + 0.4);
}

// ---------------------------------------------------------------------------
// Tiếng tổng hợp — chỉ dùng khi không có mẫu
// ---------------------------------------------------------------------------

function pluckSynth(
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

// ---------------------------------------------------------------------------
// Hàm cho giao diện gọi
// ---------------------------------------------------------------------------

/**
 * Phát một nốt theo MIDI: có mẫu thì dùng mẫu, không thì tổng hợp. Mẫu tải
 * bất đồng bộ nên thời điểm phát tính lại sau khi tải xong — trễ vài chục
 * mili giây ở lần đầu, chấp nhận được; các lần sau đã có sẵn trong cache.
 */
async function playNote(inst: Instrument, midi: number, opts: { gain: number; duration: number; delay?: number }) {
  const ac = liveContext();
  if (!ac) return;
  const delay = opts.delay ?? 0;
  const buf = inRange(inst, midi) ? await loadSample(inst, midi) : null;
  const at = ac.currentTime + delay;
  if (buf) {
    playBuffer(ac, buf, at, opts.gain, opts.duration);
  } else {
    pluckSynth(ac, midiToFreq(midi), at, {
      duration: opts.duration,
      gain: opts.gain,
      brightness: inst === "piano" ? 2600 : 3200,
      type: inst === "piano" ? "triangle" : "sawtooth",
    });
  }
}

/** Một nốt piano, theo bậc tính từ Đô giữa. */
export function playPianoStep(step: number, duration = 1.6) {
  void playNote("piano", 60 + stepToSemitone(step), { gain: 0.9, duration });
}

/** Nhiều nốt piano cùng lúc (hợp âm). */
export function playPianoChord(steps: number[], duration = 2.2) {
  // Lệch nhau vài mili giây như tay người bấm, nghe tự nhiên hơn bấm máy.
  steps.forEach((s, i) =>
    void playNote("piano", 60 + stepToSemitone(s), { gain: 0.6, duration, delay: i * 0.012 })
  );
}

/**
 * Hợp âm guitar từ thế bấm (6 số, dây 6 → dây 1, -1 là không đánh).
 * "strum" quạt xuống một nhát; "arpeggio" rải từng dây.
 */
export function playGuitarChord(frets: number[], style: "strum" | "arpeggio" = "strum") {
  const gap = style === "strum" ? 0.035 : 0.22;
  let n = 0;
  frets.forEach((fret, i) => {
    if (fret < 0) return;
    void playNote("guitar", GUITAR_OPEN_MIDI[i] + fret, {
      gain: 0.55,
      duration: style === "strum" ? 2.4 : 1.8,
      delay: n * gap,
    });
    n++;
  });
}

/**
 * Tiếng gõ nhịp: xung ngắn, phách nhấn cao hơn và to hơn. Nhận `at` theo đồng
 * hồ của AudioContext để máy đếm nhịp lên lịch trước — setTimeout không đủ
 * đều cho việc này. Cố ý là tiếng tổng hợp: gõ nhịp cần khô và gọn.
 */
export function scheduleClick(at: number, accent: boolean) {
  const ac = liveContext();
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
  const ac = liveContext();
  return ac ? ac.currentTime : null;
}
