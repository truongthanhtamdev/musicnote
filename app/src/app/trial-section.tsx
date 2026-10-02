"use client";

import { useRef, useState } from "react";
import { LuckyWheel } from "./lucky-wheel";
import { TrialForm } from "./trial-form";
import { IconClock } from "@/components/icons";
import type { WheelState } from "@/lib/wheel-state";

/**
 * Vòng quay + form học thử. Gửi form xong thì vòng quay mở khoá và cuộn tới
 * (trên điện thoại vòng quay nằm phía trên form, khách không tự thấy).
 */
export function TrialSection({
  initialWheel,
  facebookUrl,
}: {
  initialWheel: WheelState;
  facebookUrl: string | null;
}) {
  const [unlocked, setUnlocked] = useState(initialWheel.unlocked);
  // Mỗi lần gửi đăng ký mới là một lượt quay mới — đổi key để vòng quay
  // về trạng thái chưa quay (cùng số điện thoại thì máy chủ trả lại kết quả cũ).
  const [round, setRound] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [wonSessions, setWonSessions] = useState<number | null>(null);

  function onSubmitted(wheelOpen: boolean) {
    if (!wheelOpen) return;
    setUnlocked(true);
    setWonSessions(null);
    setRound((r) => r + 1);
    window.setTimeout(() => wheelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
  }

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20 grid gap-10 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start">
      <LuckyWheel
        key={round}
        unlocked={unlocked}
        initialPrize={round === 0 ? initialWheel.prize : null}
        anchorRef={wheelRef}
        onSpun={setWonSessions}
        onNext={unlocked ? () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) : undefined}
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
          <TrialForm wonSessions={wonSessions} facebookUrl={facebookUrl} onSubmitted={onSubmitted} onSpinClick={() => wheelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} />
        </div>
      </div>
    </div>
  );
}
