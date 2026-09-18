"use client";

import { useEffect, useState } from "react";
import { PianoKeys } from "@/components/piano-keys";
import { MusicStaff } from "@/components/music-staff";
import { playPianoStep, warmPiano } from "@/lib/audio";
import { noteLabel, noteNameOfStep } from "@/lib/piano";

/**
 * Bàn phím bấm được: bấm phím nào thì nghe tiếng và thấy nốt đó vẽ lên khuông
 * nhạc. Đây là chiều ngược lại của game đọc nốt — game là "thấy nốt, đoán
 * tên", còn đây là "bấm phím, xem nốt nằm đâu" — hai chiều đi cùng nhau thì
 * liên kết giấy ↔ đàn mới chắc.
 */
export default function PlayablePiano() {
  const [last, setLast] = useState<number | null>(null);
  useEffect(warmPiano, []);

  function press(step: number) {
    playPianoStep(step);
    setLast(step);
  }

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-ink-900">Bấm thử — nghe tiếng, xem nốt nằm đâu trên khuông</p>
        {last != null && (
          <span className="text-sm text-ink-600">
            Vừa bấm: <span className="font-bold text-wood-700">{noteNameOfStep(last)}</span>{" "}
            <span className="text-ink-400">({noteLabel(last)})</span>
          </span>
        )}
      </div>

      <div className="overflow-x-auto scroll-thin mt-4">
        <PianoKeys step={last} octaves={3} fromStep={-7} onKeyClick={press} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl bg-ivory-50 border border-navy-100 p-3 overflow-x-auto scroll-thin">
          <MusicStaff clef="sol" step={last != null && last >= 0 ? last : null} width={260} />
        </div>
        <div className="rounded-xl bg-ivory-50 border border-navy-100 p-3 overflow-x-auto scroll-thin">
          <MusicStaff clef="fa" step={last != null && last <= 0 ? last : null} width={260} />
        </div>
      </div>
      <p className="text-xs text-ink-500 mt-3">
        Nốt từ Đô giữa trở lên vẽ trên khuông khóa Sol, từ Đô giữa trở xuống vẽ trên khuông khóa
        Fa — Đô giữa hiện ở cả hai. Tiếng ghi từ piano thật; lần đầu bấm một nốt có thể chậm
        một nhịp vì đang tải, các lần sau thì tức thì.
      </p>
    </div>
  );
}
