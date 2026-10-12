/**
 * Hiệu ứng ăn mừng cho vòng quay: tiếng "tách" khi kim lướt qua ô, tiếng
 * chuông khi trúng, và pháo giấy. Không dùng thư viện ngoài — WebAudio và
 * canvas có sẵn trong trình duyệt. Mọi thứ đều im lặng nếu trình duyệt chặn.
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Gọi ngay trong cú bấm của khách — iPhone chỉ cho phát tiếng sau thao tác người dùng. */
export function unlockAudio() {
  audio();
}

function beep(freq: number, start: number, dur: number, vol: number, type: OscillatorType = "square") {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Tiếng "tách" ngắn khi kim lướt qua một ô. */
export function tick() {
  beep(1400, 0, 0.03, 0.05);
}

/** Chuỗi nốt đi lên khi trúng thưởng. */
export function fanfare() {
  [523, 659, 784, 1047].forEach((f, i) => beep(f, i * 0.12, 0.25, 0.08, "triangle"));
  beep(1319, 0.5, 0.6, 0.07, "triangle");
}

/** Pháo giấy bung từ giữa màn hình, tự dọn sau ~3,5 giây. */
export function confetti() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:100";
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const g = canvas.getContext("2d");
  if (!g) return canvas.remove();
  g.scale(dpr, dpr);

  const colors = ["#D9483B", "#E8A86B", "#F3C94B", "#2E9E8F", "#1E3A5F", "#FFFFFF"];
  const W = window.innerWidth;
  const H = window.innerHeight;
  const parts = Array.from({ length: 160 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 6 + Math.random() * 9;
    return {
      x: W / 2,
      y: H * 0.42,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 6,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 10,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      c: colors[Math.floor(Math.random() * colors.length)],
    };
  });
  const startedAt = performance.now();
  requestAnimationFrame(function frame(t) {
    const life = t - startedAt;
    g.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.32;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      g.save();
      g.globalAlpha = Math.max(0, 1 - life / 3500);
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillStyle = p.c;
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      g.restore();
    }
    if (life < 3500) requestAnimationFrame(frame);
    else canvas.remove();
  });
}
