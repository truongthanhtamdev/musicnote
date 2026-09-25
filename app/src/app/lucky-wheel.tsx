"use client";

import { useState } from "react";
import { spinWheelAction } from "@/actions/wheel";
import { WHEEL_SEGMENTS } from "@/lib/wheel";
import { trackEvent } from "@/lib/analytics";
import { IconCheckCircle } from "@/components/icons";

const SIZE = 260;
const R = SIZE / 2;
const CENTER = R;
const SLICE = 360 / WHEEL_SEGMENTS.length;
const SPIN_MS = 4200;
/** Số vòng quay thêm trước khi dừng, để nhìn ra một cú quay thật. */
const EXTRA_TURNS = 5;

/** Màu xen kẽ theo bảng màu của trang, ô giải cao nhất nổi hơn. */
const SLICE_FILL = ["#F6EFE3", "#FFFFFF"];
const BIG_PRIZE_FILL = "#FBE3D6";

/** Điểm trên đường tròn tại góc `deg` tính theo chiều kim đồng hồ từ 12 giờ. */
function point(deg: number, radius: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

function slicePath(index: number) {
  const [x1, y1] = point(index * SLICE, R - 4);
  const [x2, y2] = point((index + 1) * SLICE, R - 4);
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${R - 4} ${R - 4} 0 0 1 ${x2} ${y2} Z`;
}

/**
 * Vòng quay may mắn ở trang chủ: quay ra 1–5 buổi học thử miễn phí.
 *
 * Kết quả do máy chủ quyết định và ký vào cookie httpOnly — ở đây chỉ lo phần
 * hoạt ảnh dừng đúng ô. Nhờ vậy số hiện trên màn hình luôn khớp số trung tâm
 * nhận được khi khách gửi form.
 */
export function LuckyWheel() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<number | null>(null);

  async function spin() {
    if (spinning || prize !== null) return;
    setSpinning(true);
    try {
      const result = await spinWheelAction();

      // Đưa tâm ô trúng lên đúng vị trí mũi tên ở 12 giờ.
      const target = EXTRA_TURNS * 360 - (result.index * SLICE + SLICE / 2);
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      setRotation(reduced ? target - EXTRA_TURNS * 360 : target);
      window.setTimeout(
        () => {
          setPrize(result.sessions);
          setSpinning(false);
          trackEvent("quay_vong_may_man", { so_buoi: result.sessions });
        },
        reduced ? 0 : SPIN_MS
      );
    } catch {
      setSpinning(false);
    }
  }

  return (
    <div className="flex flex-col items-center text-center">
      <h3 className="text-lg font-bold text-ink-900">Vòng quay may mắn</h3>
      <p className="text-sm text-ink-600 mt-1 max-w-xs">
        Quay một lượt để nhận <span className="font-semibold">1 đến 3 buổi học thử miễn phí</span>,
        rồi điền thông tin đăng ký để nhận thưởng.
      </p>

      <div className="relative mt-5" style={{ width: SIZE, height: SIZE + 18 }}>
        {/* Mũi tên chỉ ô trúng, đứng yên ở 12 giờ */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 z-10"
          style={{
            width: 0,
            height: 0,
            borderLeft: "11px solid transparent",
            borderRight: "11px solid transparent",
            borderTop: "18px solid #C2410C",
          }}
        />
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="absolute top-[18px] left-0 drop-shadow-sm"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.17, 0.67, 0.12, 1)` : undefined,
          }}
          aria-hidden="true"
        >
          <circle cx={CENTER} cy={CENTER} r={R - 1} fill="#1E3A5F" />
          {WHEEL_SEGMENTS.map((sessions, i) => {
            const angle = i * SLICE + SLICE / 2;
            const [tx, ty] = point(angle, R * 0.64);
            // Số ở nửa dưới vòng quay bị lộn ngược nếu xoay thẳng theo góc —
            // lật thêm 180° để lượt nào dừng ở đâu cũng đọc được ngay.
            const textAngle = angle > 90 && angle < 270 ? angle + 180 : angle;
            return (
              <g key={i}>
                <path
                  d={slicePath(i)}
                  fill={sessions >= 3 ? BIG_PRIZE_FILL : SLICE_FILL[i % 2]}
                  stroke="#1E3A5F"
                  strokeWidth="1.5"
                />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="19"
                  fontWeight="700"
                  fill="#7A4E2D"
                  transform={`rotate(${textAngle} ${tx} ${ty})`}
                >
                  {sessions}
                </text>
              </g>
            );
          })}
          <circle cx={CENTER} cy={CENTER} r="26" fill="#1E3A5F" />
          <text
            x={CENTER}
            y={CENTER}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10"
            fontWeight="700"
            fill="#FFFFFF"
          >
            BUỔI
          </text>
        </svg>
      </div>

      {prize === null ? (
        <button
          type="button"
          onClick={spin}
          disabled={spinning}
          className="mt-5 rounded-xl bg-coral-600 hover:bg-coral-700 disabled:opacity-60 text-white px-6 py-3 text-sm font-semibold transition"
        >
          {spinning ? "Đang quay…" : "Quay ngay"}
        </button>
      ) : (
        <div className="mt-5 rounded-2xl border border-mint-200 bg-mint-50 px-5 py-4 max-w-xs">
          <IconCheckCircle className="w-7 h-7 text-mint-600 mx-auto" />
          <p className="font-bold text-ink-900 mt-2">
            Bạn nhận được {prize} buổi học thử miễn phí!
          </p>
          <p className="text-sm text-ink-600 mt-1">
            Điền thông tin đăng ký để trung tâm liên hệ xếp lịch. Phần thưởng đã được ghi nhận —
            mỗi người một lượt quay.
          </p>
        </div>
      )}
    </div>
  );
}
