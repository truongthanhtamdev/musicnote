"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { IconCheckCircle } from "@/components/icons";
import { WheelGraphic, restingAngle } from "./wheel-graphic";

const SIZE = 250;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Vòng quay may mắn cạnh form học thử — bản "giới thiệu": tự quay chậm cho
 * khách thấy có quà, khoá tới khi gửi đăng ký. Cú quay thật diễn ra ở màn
 * quay lớn (SpinModal) bật lên ngay khi gửi form; ở đây chỉ mở lại màn đó và
 * hiện kết quả đã trúng.
 */
export function LuckyWheel({
  unlocked,
  prize,
  anchorRef,
  onOpen,
  onNext,
}: {
  unlocked: boolean;
  /** Số buổi đã trúng (null = chưa quay). */
  prize: number | null;
  anchorRef?: RefObject<HTMLDivElement | null>;
  /** Mở màn quay lớn. */
  onOpen: () => void;
  /** Quay xong thì đưa khách xuống các bước tiếp theo (đăng nhập, kết bạn). */
  onNext?: () => void;
}) {
  const wheelRef = useRef<SVGSVGElement>(null);
  const angle = useRef(prize ? restingAngle(prize) : 0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => setReduced(prefersReducedMotion()), []);

  // Chưa quay thì vòng tự quay chậm; mở khoá rồi thì quay nhanh hơn, như mời bấm.
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    if (prize !== null) angle.current = restingAngle(prize);
    el.style.transform = `rotate(${angle.current}deg)`;
    if (prize !== null || reduced) return;
    const speed = unlocked ? 60 : 20;
    let last = performance.now();
    let raf = requestAnimationFrame(function idle(t) {
      angle.current += ((t - last) / 1000) * speed;
      last = t;
      el.style.transform = `rotate(${angle.current}deg)`;
      raf = requestAnimationFrame(idle);
    });
    return () => cancelAnimationFrame(raf);
  }, [prize, unlocked, reduced]);

  return (
    <div ref={anchorRef} className="scroll-mt-24 flex flex-col items-center text-center">
      <h3 className="text-lg font-bold text-ink-900">🎁 Vòng quay may mắn</h3>
      <p className="text-sm text-ink-600 mt-1 max-w-xs">
        Gửi đăng ký học thử là được quay một lượt — trúng{" "}
        <span className="font-semibold text-coral-600">tặng thêm 1 đến 3 buổi</span> khi đăng ký khóa học.
      </p>

      <div className="mt-4">
        <WheelGraphic
          size={SIZE}
          wheelRef={wheelRef}
          lightsOn={!reduced}
          centerLabel={prize !== null ? `+${prize}` : unlocked ? "QUAY" : "🔒"}
          onCenterClick={unlocked && prize === null ? onOpen : undefined}
        />
      </div>

      {prize === null && !unlocked ? (
        <div className="mt-5 max-w-xs">
          <button
            type="button"
            disabled
            className="rounded-xl bg-navy-200 text-ink-500 px-6 py-3 text-sm font-semibold cursor-not-allowed"
          >
            🔒 Điền thông tin để quay
          </button>
          <p className="text-xs text-ink-500 mt-2">
            <span className="lg:hidden">Điền form đăng ký bên dưới</span>
            <span className="hidden lg:inline">Điền form đăng ký bên cạnh</span> — gửi xong là quay được ngay.
          </p>
        </div>
      ) : prize === null ? (
        <button
          type="button"
          onClick={onOpen}
          className="mt-5 rounded-xl bg-coral-600 hover:bg-coral-700 text-white px-7 py-3 text-base font-bold transition shadow-lg shadow-coral-600/30 animate-pulse"
        >
          🎯 Quay ngay
        </button>
      ) : (
        <div className="mt-5 rounded-2xl border border-mint-200 bg-mint-50 px-5 py-4 max-w-xs">
          <IconCheckCircle className="w-7 h-7 text-mint-600 mx-auto" />
          <p className="font-bold text-ink-900 mt-2">
            Bạn được tặng thêm {prize} buổi khi đăng ký khóa học!
          </p>
          <p className="text-sm text-ink-600 mt-1">
            Đã ghi vào đăng ký của bạn. Mỗi số điện thoại một lượt quay.
          </p>
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="mt-3 rounded-xl bg-wood-500 hover:bg-wood-600 text-white px-4 py-2 text-sm font-semibold transition"
            >
              Xem bước tiếp theo ↓
            </button>
          )}
        </div>
      )}
    </div>
  );
}
