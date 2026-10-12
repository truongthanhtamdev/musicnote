"use client";

import { useRef, useState } from "react";
import { LuckyWheel } from "./lucky-wheel";
import { SpinModal } from "./spin-modal";
import { TrialForm } from "./trial-form";
import { IconClock } from "@/components/icons";
import type { WheelState } from "@/lib/wheel-state";

/**
 * Vòng quay + form học thử. Gửi form xong là bật ngay màn quay lớn giữa màn
 * hình — khách đang hào hứng sau khi đăng ký, quay luôn lúc đó mới có cảm
 * giác "trúng thưởng", thay vì phải tự tìm vòng quay nhỏ ở góc trang.
 */
export function TrialSection({
  initialWheel,
  facebookUrl,
}: {
  initialWheel: WheelState;
  facebookUrl: string | null;
}) {
  const [unlocked, setUnlocked] = useState(initialWheel.unlocked);
  const [prize, setPrize] = useState<number | null>(initialWheel.prize);
  const [modalOpen, setModalOpen] = useState(false);
  // Mỗi lần mở màn quay là một màn mới (về trạng thái chưa quay).
  const [round, setRound] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  function openSpin() {
    setRound((r) => r + 1);
    setModalOpen(true);
  }

  function onSubmitted(wheelOpen: boolean) {
    if (!wheelOpen) return;
    setUnlocked(true);
    setPrize(null);
    openSpin();
  }

  function closeSpin() {
    setModalOpen(false);
    // Quay xong rồi thì đưa khách tới màn cảm ơn (hướng dẫn đăng nhập, kết bạn).
    if (prize !== null) {
      window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20 grid gap-10 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start">
      <LuckyWheel
        unlocked={unlocked}
        prize={prize}
        anchorRef={wheelRef}
        onOpen={openSpin}
        onNext={prize !== null ? () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) : undefined}
      />

      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
          Đăng ký học thử miễn phí
        </h2>
        <p className="text-ink-600 mt-2 flex items-start gap-1.5">
          <IconClock className="w-4 h-4 mt-1 shrink-0 text-wood-500" />
          <span>
            Để lại thông tin, trung tâm liên hệ xếp buổi học thử 60 phút — miễn phí và không ràng
            buộc. Gửi xong bạn được quay vòng quay may mắn, trúng tới 3 buổi tặng thêm khi đăng ký khóa học.
          </span>
        </p>
        <div ref={formRef} className="mt-7 scroll-mt-24">
          <TrialForm
            wonSessions={prize}
            facebookUrl={facebookUrl}
            onSubmitted={onSubmitted}
            onSpinClick={unlocked && prize === null ? openSpin : undefined}
          />
        </div>
      </div>

      <SpinModal key={round} open={modalOpen} onClose={closeSpin} onWon={setPrize} />
    </div>
  );
}
