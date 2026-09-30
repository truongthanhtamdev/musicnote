"use client";

import { useState, type RefObject } from "react";
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
 * Vòng quay may mắn ở trang chủ: quay ra 1–3 buổi tặng thêm khi đăng ký khóa học.
 *
 * Khoá cho tới khi khách gửi form đăng ký học thử. Kết quả do máy chủ quyết
 * định và ghi thẳng vào đăng ký vừa gửi — ở đây chỉ lo phần hoạt ảnh dừng
 * đúng ô, nên số hiện trên màn hình luôn khớp số trung tâm nhận được.
 */
export function LuckyWheel({
  unlocked,
  initialPrize,
  anchorRef,
}: {
  unlocked: boolean;
  initialPrize: number | null;
  anchorRef?: RefObject<HTMLDivElement | null>;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<number | null>(initialPrize);
  const [error, setError] = useState<string | null>(null);

  async function spin() {
    if (!unlocked || spinning || prize !== null) return;
    setSpinning(true);
    setError(null);
    try {
      const result = await spinWheelAction();
      if ("error" in result) {
        setError(result.error);
        setSpinning(false);
        return;
      }

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
    <div ref={anchorRef} className="scroll-mt-24 flex flex-col items-center text-center">
      <h3 className="text-lg font-bold text-ink-900">Vòng quay may mắn</h3>
      <p className="text-sm text-ink-600 mt-1 max-w-xs">
        Điền thông tin đăng ký học thử, gửi xong là được quay một lượt nhận{" "}
        <span className="font-semibold">tặng thêm 1 đến 3 buổi khi đăng ký khóa học</span>.
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
            <span className="hidden lg:inline">Điền form đăng ký bên cạnh</span> — gửi xong vòng quay mở ngay.
          </p>
        </div>
      ) : prize === null ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={spin}
            disabled={spinning}
            className="rounded-xl bg-coral-600 hover:bg-coral-700 disabled:opacity-60 text-white px-6 py-3 text-sm font-semibold transition"
          >
            {spinning ? "Đang quay…" : "Quay ngay"}
          </button>
          {error && <p className="text-sm text-coral-600 mt-2 max-w-xs">{error}</p>}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-mint-200 bg-mint-50 px-5 py-4 max-w-xs">
          <IconCheckCircle className="w-7 h-7 text-mint-600 mx-auto" />
          <p className="font-bold text-ink-900 mt-2">
            Bạn được tặng thêm {prize} buổi khi đăng ký khóa học!
          </p>
          <p className="text-sm text-ink-600 mt-1">
            Đã ghi vào đăng ký của bạn — học thử miễn phí trước, đăng ký khóa là được cộng thêm số
            buổi này. Mỗi số điện thoại một lượt quay.
          </p>
        </div>
      )}
    </div>
  );
}
