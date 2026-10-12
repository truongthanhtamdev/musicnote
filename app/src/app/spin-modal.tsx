"use client";

import { useEffect, useRef, useState } from "react";
import { spinWheelAction } from "@/actions/wheel";
import { trackEvent } from "@/lib/analytics";
import { confetti, fanfare, tick, unlockAudio } from "@/lib/celebrate";
import { SLICE, WheelGraphic, settleAngle } from "./wheel-graphic";

const SPIN_MS = 5600;
/** Số vòng quay thêm trước khi dừng — đủ dài để hồi hộp. */
const EXTRA_TURNS = 6;
/** Tốc độ quay chờ máy chủ trả kết quả (độ/giây). */
const WAIT_SPEED = 720;

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Chậm dần rất lâu ở cuối — đoạn "lết qua từng ô" là đoạn hồi hộp nhất. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Màn quay thưởng toàn màn hình, bật lên ngay khi khách gửi đăng ký học thử.
 *
 * Kết quả vẫn do máy chủ quyết định (spinWheelAction) — ở đây chỉ lo cho cú
 * quay có cảm giác thật: vòng to, đèn chớp, "tách tách" mỗi lần kim lướt qua
 * một ô, chậm dần rồi dừng đúng ô trúng, pháo giấy + chuông khi trúng.
 */
export function SpinModal({
  open,
  onClose,
  onWon,
}: {
  open: boolean;
  onClose: () => void;
  /** Quay xong — báo số buổi trúng cho vòng quay nhỏ và màn cảm ơn. */
  onWon: (sessions: number) => void;
}) {
  const [phase, setPhase] = useState<"ready" | "spinning" | "won">("ready");
  const [prize, setPrize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState(300);
  const wheelRef = useRef<SVGSVGElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const lastSlice = useRef(0);

  // Vòng to vừa màn hình điện thoại.
  useEffect(() => {
    if (!open) return;
    const fit = () => setSize(Math.max(240, Math.min(340, window.innerWidth - 64, window.innerHeight - 330)));
    fit();
    window.addEventListener("resize", fit);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", fit);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Chưa bấm thì vòng tự quay chậm, mời bấm.
  useEffect(() => {
    if (!open || phase !== "ready" || reducedMotion()) return;
    let last = performance.now();
    let raf = requestAnimationFrame(function idle(t) {
      angle.current += ((t - last) / 1000) * 40;
      last = t;
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${angle.current}deg)`;
      raf = requestAnimationFrame(idle);
    });
    return () => cancelAnimationFrame(raf);
  }, [open, phase]);

  function render(a: number) {
    angle.current = a;
    if (wheelRef.current) wheelRef.current.style.transform = `rotate(${a}deg)`;
    // Kim lướt qua một vạch chia ô: "tách" + kim giật nhẹ.
    const s = Math.floor(a / SLICE);
    if (s !== lastSlice.current) {
      lastSlice.current = s;
      tick();
      const p = pointerRef.current;
      if (p) {
        p.style.transform = "rotate(-16deg)";
        window.setTimeout(() => (p.style.transform = ""), 70);
      }
    }
  }

  async function spin() {
    if (phase !== "ready") return;
    unlockAudio();
    setError(null);
    setPhase("spinning");
    lastSlice.current = Math.floor(angle.current / SLICE);

    // Quay đều trong lúc chờ máy chủ.
    let waiting = true;
    let last = performance.now();
    requestAnimationFrame(function wait(t) {
      if (!waiting) return;
      render(angle.current + ((t - last) / 1000) * WAIT_SPEED);
      last = t;
      requestAnimationFrame(wait);
    });

    let result: Awaited<ReturnType<typeof spinWheelAction>>;
    try {
      result = await spinWheelAction();
    } catch {
      result = { error: "Mạng chập chờn — bấm quay lại giúp mình nhé." };
    }
    waiting = false;
    if ("error" in result) {
      setError(result.error);
      setPhase("ready");
      return;
    }

    const won = result.sessions;
    const finish = () => {
      setPrize(won);
      setPhase("won");
      fanfare();
      confetti();
      onWon(won);
      trackEvent("quay_vong_may_man", { so_buoi: won });
    };

    const start = angle.current;
    const target = Math.ceil(start / 360) * 360 + EXTRA_TURNS * 360 + settleAngle(result.index);
    if (reducedMotion()) {
      render(target);
      finish();
      return;
    }
    const t0 = performance.now();
    requestAnimationFrame(function step(t) {
      const k = Math.min(1, (t - t0) / SPIN_MS);
      render(start + (target - start) * easeOut(k));
      if (k < 1) requestAnimationFrame(step);
      else window.setTimeout(finish, 250);
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Vòng quay may mắn"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#FFF7EC] to-white px-5 pt-6 pb-6 text-center shadow-2xl">
        {phase !== "spinning" && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 h-9 w-9 rounded-full text-ink-400 hover:bg-ink-900/5 hover:text-ink-700 text-xl leading-none"
            aria-label="Đóng"
          >
            ×
          </button>
        )}

        {phase === "won" && prize !== null ? (
          <div className="prize-pop py-2">
            <p className="text-5xl">🎉</p>
            <p className="mt-2 text-sm font-bold uppercase tracking-widest text-coral-600">Chúc mừng bạn!</p>
            <p className="mt-1 text-6xl font-black text-coral-600 tabular">+{prize}</p>
            <p className="text-xl font-extrabold text-ink-900">buổi học miễn phí</p>
            <p className="mt-3 text-sm text-ink-600">
              Đã ghi vào đăng ký của bạn — đăng ký khóa học là được cộng thêm {prize} buổi.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-2xl bg-coral-600 hover:bg-coral-700 px-6 py-4 text-base font-bold text-white shadow-lg shadow-coral-600/30"
            >
              Nhận quà & xem bước tiếp theo →
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-bold uppercase tracking-widest text-wood-600">Đăng ký thành công 🎁</p>
            <h3 className="mt-1 text-2xl font-black text-ink-900">Quay để nhận quà!</h3>
            <p className="mt-1 text-sm text-ink-600">Trúng 1 – 3 buổi học tặng thêm khi đăng ký khóa học</p>

            <div className={`mt-4 flex justify-center ${phase === "spinning" ? "wheel-spinning" : ""}`}>
              <WheelGraphic
                size={size}
                wheelRef={wheelRef}
                pointerRef={pointerRef}
                lightsOn={!reducedMotion()}
                centerLabel={phase === "spinning" ? "…" : "QUAY"}
                onCenterClick={phase === "ready" ? spin : undefined}
              />
            </div>

            <button
              type="button"
              onClick={spin}
              disabled={phase !== "ready"}
              className={`mt-5 w-full rounded-2xl px-6 py-4 text-lg font-black text-white shadow-lg transition ${
                phase === "ready"
                  ? "bg-coral-600 hover:bg-coral-700 shadow-coral-600/40 animate-pulse"
                  : "bg-coral-500 cursor-wait"
              }`}
            >
              {phase === "ready" ? "🎯 QUAY NGAY" : "Đang quay…"}
            </button>
            {error && <p className="mt-3 text-sm text-coral-700">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
