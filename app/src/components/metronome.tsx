"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioNow, scheduleClick } from "@/lib/audio";
import { IconPause, IconPlay } from "@/components/icons";

const METERS = [2, 3, 4, 6] as const;
const MIN_BPM = 40;
const MAX_BPM = 208;

/**
 * Máy đếm nhịp.
 *
 * Lên lịch từng tiếng gõ theo đồng hồ của AudioContext, cứ 25ms nhìn trước
 * 100ms và đặt sẵn những tiếng sắp tới. setInterval gõ thẳng thì trượt vài
 * chục mili giây mỗi phách — với máy đếm nhịp thì đó là hỏng, vì cả mục đích
 * của nó là làm mốc cho tay người đều theo.
 */
export function Metronome({ compact = false }: { compact?: boolean }) {
  const [bpm, setBpm] = useState(80);
  const [meter, setMeter] = useState<(typeof METERS)[number]>(4);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);

  const nextTimeRef = useRef(0);
  const beatRef = useRef(0);
  const bpmRef = useRef(bpm);
  const meterRef = useRef<number>(meter);
  const timerRef = useRef<number | null>(null);
  // Vòng lặp lên lịch đọc bpm/nhịp qua ref để đổi tốc độ giữa chừng không
  // phải khởi động lại; cập nhật ref trong effect chứ không lúc render.
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const stop = useCallback(() => {
    if (timerRef.current != null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setRunning(false);
    setBeat(-1);
  }, []);

  const start = useCallback(() => {
    const now = audioNow();
    if (now == null) return;
    nextTimeRef.current = now + 0.05;
    beatRef.current = 0;
    setRunning(true);

    timerRef.current = window.setInterval(() => {
      const t = audioNow();
      if (t == null) return;
      while (nextTimeRef.current < t + 0.1) {
        const b = beatRef.current;
        scheduleClick(nextTimeRef.current, b === 0);
        // Đèn nháy dùng setTimeout theo khoảng cách tới lúc tiếng phát, để
        // hình khớp tiếng dù tiếng đã được đặt lịch trước.
        const delay = Math.max(0, (nextTimeRef.current - t) * 1000);
        window.setTimeout(() => setBeat(b), delay);
        nextTimeRef.current += 60 / bpmRef.current;
        beatRef.current = (b + 1) % meterRef.current;
      }
    }, 25);
  }, []);

  useEffect(() => stop, [stop]);

  // Đổi nhịp lúc đang chạy thì về phách 1 để không có ô nhịp cụt.
  useEffect(() => {
    meterRef.current = meter;
    beatRef.current = 0;
  }, [meter]);

  const nudge = (d: number) => setBpm((v) => Math.min(MAX_BPM, Math.max(MIN_BPM, v + d)));

  return (
    <div className={`rounded-2xl border border-navy-100 bg-white ${compact ? "p-4" : "p-5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink-900">Máy đếm nhịp</p>
          <p className="text-xs text-ink-500 mt-0.5">Phách 1 kêu cao hơn. Tập gì cũng bật cái này lên trước.</p>
        </div>
        <button
          type="button"
          onClick={running ? stop : start}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white transition ${
            running ? "bg-coral-600 hover:bg-coral-700" : "bg-navy-950 hover:bg-navy-900"
          }`}
        >
          {running ? <IconPause className="w-4 h-4" /> : <IconPlay className="w-4 h-4" />}
          {running ? "Dừng" : "Bắt đầu"}
        </button>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button type="button" onClick={() => nudge(-5)} className="rounded-lg border border-navy-200 w-10 h-10 font-bold text-ink-700 hover:bg-ivory-100" aria-label="Chậm lại 5">
          −
        </button>
        <div className="flex-1 text-center">
          <div className="text-4xl font-bold text-ink-900 tabular leading-none">{bpm}</div>
          <div className="text-xs text-ink-500 mt-1">phách / phút</div>
        </div>
        <button type="button" onClick={() => nudge(5)} className="rounded-lg border border-navy-200 w-10 h-10 font-bold text-ink-700 hover:bg-ivory-100" aria-label="Nhanh lên 5">
          +
        </button>
      </div>
      <input
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        value={bpm}
        onChange={(e) => setBpm(Number(e.target.value))}
        aria-label="Tốc độ"
        className="w-full mt-3 accent-wood-600"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <div className="flex gap-1.5">
          {METERS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMeter(m)}
              className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                meter === m
                  ? "border-wood-600 bg-wood-600 text-white"
                  : "border-navy-200 bg-white text-ink-600 hover:border-wood-300"
              }`}
            >
              {m}/{m === 6 ? 8 : 4}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: meter }, (_, i) => (
            <span
              key={i}
              className={`block w-3.5 h-3.5 rounded-full transition ${
                beat === i ? (i === 0 ? "bg-wood-600 scale-125" : "bg-navy-700") : "bg-navy-100"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
