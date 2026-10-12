"use client";

import type { Ref } from "react";
import { WHEEL_SEGMENTS } from "@/lib/wheel";

export const SLICE = 360 / WHEEL_SEGMENTS.length;

/** Màu ô theo số buổi — 3 buổi là ô "jackpot" nổi nhất. */
const FILL: Record<number, string> = { 1: "#F3E3C7", 2: "#E8A86B", 3: "#D9483B" };
const TEXT: Record<number, string> = { 1: "#7A4E2D", 2: "#FFFFFF", 3: "#FFFFFF" };

/** Góc để vòng quay dừng với tâm ô `index` ngay dưới mũi tên ở 12 giờ. */
export function settleAngle(index: number): number {
  return (360 - (index * SLICE + SLICE / 2)) % 360;
}

/** Góc nghỉ ở một ô có đúng số buổi (khách tải lại trang sau khi đã quay). */
export function restingAngle(sessions: number): number {
  return settleAngle(Math.max(0, WHEEL_SEGMENTS.findIndex((s) => s === sessions)));
}

/**
 * Hình vòng quay: ô màu theo số buổi, đèn nhấp nháy quanh viền, mũi tên đứng
 * yên ở 12 giờ. Phần xoay là <svg> (ref `wheelRef`) — chỉ đổi transform của nó,
 * không vẽ lại React mỗi khung hình.
 */
export function WheelGraphic({
  size,
  wheelRef,
  pointerRef,
  lightsOn = true,
  centerLabel = "BUỔI",
  onCenterClick,
}: {
  size: number;
  wheelRef: Ref<SVGSVGElement>;
  pointerRef?: Ref<HTMLDivElement>;
  /** Đèn viền nhấp nháy (tắt khi khách bật giảm chuyển động). */
  lightsOn?: boolean;
  centerLabel?: string;
  /** Bấm vào nút giữa vòng quay. */
  onCenterClick?: () => void;
}) {
  const R = size / 2;
  const C = R;
  const rim = Math.max(10, Math.round(size * 0.055));
  const inner = R - rim;

  const point = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    // Làm tròn: máy chủ và trình duyệt tính cos/sin lệch ở chữ số cuối, để
    // nguyên thì React báo lệch khi gắn trang (hydration).
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return [r2(C + radius * Math.cos(rad)), r2(C + radius * Math.sin(rad))];
  };
  const slicePath = (i: number) => {
    const [x1, y1] = point(i * SLICE, inner);
    const [x2, y2] = point((i + 1) * SLICE, inner);
    return `M ${C} ${C} L ${x1} ${y1} A ${inner} ${inner} 0 0 1 ${x2} ${y2} Z`;
  };
  const bulbs = 24;
  const hub = Math.round(size * 0.13);
  const pointerW = Math.round(size * 0.07);

  return (
    <div className="relative" style={{ width: size, height: size + pointerW }}>
      {/* Mũi tên chỉ ô trúng — đứng yên, rung nhẹ mỗi lần lướt qua một ô. */}
      <div
        ref={pointerRef}
        className="absolute left-1/2 top-0 z-10 origin-top transition-transform duration-75"
        style={{ marginLeft: -pointerW, width: pointerW * 2 }}
      >
        <svg width={pointerW * 2} height={pointerW * 1.7} viewBox="0 0 40 34" aria-hidden="true">
          <path d="M20 34 L2 4 Q20 -4 38 4 Z" fill="#C2410C" stroke="#FFFFFF" strokeWidth="3" />
        </svg>
      </div>

      <svg
        ref={wheelRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute left-0 will-change-transform drop-shadow-xl"
        style={{ top: pointerW }}
        aria-hidden="true"
      >
        <circle cx={C} cy={C} r={R - 1} fill="#1E3A5F" />
        {Array.from({ length: bulbs }, (_, i) => {
          const [bx, by] = point((i * 360) / bulbs, R - rim / 2);
          return (
            <circle
              key={i}
              cx={bx}
              cy={by}
              r={Math.max(2.5, rim * 0.28)}
              fill="#FFE8A3"
              className={lightsOn ? (i % 2 ? "wheel-bulb-a" : "wheel-bulb-b") : ""}
            />
          );
        })}
        {WHEEL_SEGMENTS.map((sessions, i) => {
          const mid = i * SLICE + SLICE / 2;
          const [tx, ty] = point(mid, inner * 0.66);
          return (
            <g key={i}>
              <path d={slicePath(i)} fill={FILL[sessions]} stroke="#1E3A5F" strokeWidth="2" />
              <g transform={`rotate(${mid} ${tx} ${ty})`}>
                <text
                  x={tx}
                  y={ty - size * 0.02}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={size * 0.1}
                  fontWeight="800"
                  fill={TEXT[sessions]}
                >
                  +{sessions}
                </text>
                <text
                  x={tx}
                  y={ty + size * 0.06}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={size * 0.04}
                  fontWeight="700"
                  fill={TEXT[sessions]}
                  opacity="0.9"
                >
                  buổi
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Nút giữa: đứng yên (không xoay theo), bấm được để quay. */}
      <button
        type="button"
        onClick={onCenterClick}
        disabled={!onCenterClick}
        className="absolute z-10 rounded-full bg-navy-900 text-white font-extrabold border-4 border-white shadow-lg flex items-center justify-center disabled:cursor-default"
        style={{
          width: hub * 2,
          height: hub * 2,
          left: C - hub,
          top: pointerW + C - hub,
          fontSize: Math.max(10, size * 0.045),
        }}
        aria-label={onCenterClick ? "Quay" : undefined}
        tabIndex={onCenterClick ? 0 : -1}
      >
        {centerLabel}
      </button>
    </div>
  );
}
