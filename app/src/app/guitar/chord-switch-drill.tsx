"use client";

import { useEffect, useRef, useState } from "react";
import { CHORDS, CHORD_BY_NAME } from "@/lib/guitar";
import { audioNow, scheduleClick } from "@/lib/audio";
import { readBest, saveBest } from "@/lib/best-score";
import { ChordDiagram } from "@/components/chord-diagram";
import { btn } from "@/components/ui";

const SECONDS = 60;
const OPEN = CHORDS.filter((c) => c.group === "major" || c.group === "minor" || c.group === "seventh").map((c) => c.name);

/** Cặp gợi ý theo thứ tự nên tập — hai cặp đầu là chỗ người mới vấp nhiều nhất. */
const SUGGESTED: [string, string][] = [
  ["C", "G"],
  ["G", "D"],
  ["Am", "Em"],
  ["C", "Am"],
  ["D", "A"],
  ["Em", "G"],
];

const keyFor = (a: string, b: string) => `musicnote-switch-${[a, b].sort().join("-")}`;

/**
 * Bài tập đổi hợp âm một phút — bài tập kinh điển nhất cho người mới.
 *
 * Chọn hai hợp âm, chạy 60 giây có tiếng nhịp, mỗi lần đổi xong bấm nút đếm
 * (hoặc phím cách). Con số cuối lượt so với kỷ lục cặp đó — thấy số tăng
 * từng ngày là động lực thật, hơn bất kỳ lời khen nào.
 */
export default function ChordSwitchDrill() {
  const [a, setA] = useState("C");
  const [b, setB] = useState("G");
  const [left, setLeft] = useState(SECONDS);
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ count: number; best: number } | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [showing, setShowing] = useState<0 | 1>(0);

  const timerRef = useRef<number | null>(null);
  const clickRef = useRef<number | null>(null);
  const nextClickRef = useRef(0);
  const countRef = useRef(0);

  function stopTimers() {
    if (timerRef.current != null) window.clearInterval(timerRef.current);
    if (clickRef.current != null) window.clearInterval(clickRef.current);
    timerRef.current = clickRef.current = null;
  }

  useEffect(() => stopTimers, []);

  function start() {
    setBest(readBest(keyFor(a, b)));
    setResult(null);
    setCount(0);
    countRef.current = 0;
    setShowing(0);
    setLeft(SECONDS);
    setRunning(true);

    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const remain = SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      if (remain <= 0) {
        finish();
      } else {
        setLeft(remain);
      }
    }, 200);

    // Tiếng nhịp 60 phách/phút — một tiếng mỗi giây, mốc để đổi cho đều.
    const now = audioNow();
    if (now != null) {
      nextClickRef.current = now + 0.05;
      clickRef.current = window.setInterval(() => {
        const t = audioNow();
        if (t == null) return;
        while (nextClickRef.current < t + 0.1) {
          scheduleClick(nextClickRef.current, false);
          nextClickRef.current += 1;
        }
      }, 25);
    }
  }

  function finish() {
    stopTimers();
    setRunning(false);
    setLeft(0);
    const final = countRef.current;
    const newBest = saveBest(keyFor(a, b), final);
    setBest(newBest);
    setResult({ count: final, best: newBest });
  }

  function tap() {
    if (!running) return;
    countRef.current += 1;
    setCount(countRef.current);
    setShowing((s) => (s === 0 ? 1 : 0));
  }

  // Phím cách để đếm — tay đang ôm đàn thì đập một cái vào bàn phím dễ hơn bấm chuột.
  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const chordA = CHORD_BY_NAME.get(a);
  const chordB = CHORD_BY_NAME.get(b);

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-ink-900 text-lg">Bài tập đổi hợp âm 1 phút</p>
          <p className="text-sm text-ink-500 mt-0.5">
            Chọn hai hợp âm, bấm bắt đầu, đổi qua lại theo tiếng nhịp. Mỗi lần đổi xong bấm nút
            đếm hoặc phím cách.
          </p>
        </div>
        {best != null && !running && (
          <span className="text-sm text-ink-500">
            Kỷ lục {a}↔{b}: <span className="font-bold text-ink-900">{best}</span>
          </span>
        )}
      </div>

      {!running && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <select value={a} onChange={(e) => setA(e.target.value)} aria-label="Hợp âm 1" className="rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm font-semibold">
            {OPEN.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-ink-400">↔</span>
          <select value={b} onChange={(e) => setB(e.target.value)} aria-label="Hợp âm 2" className="rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm font-semibold">
            {OPEN.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5 sm:ml-2">
            {SUGGESTED.map(([x, y]) => (
              <button
                key={x + y}
                type="button"
                onClick={() => { setA(x); setB(y); }}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                  (a === x && b === y) ? "border-wood-600 bg-wood-600 text-white" : "border-navy-200 bg-white text-ink-600 hover:border-wood-300"
                }`}
              >
                {x}↔{y}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-5">
        {[chordA, chordB].map((c, i) =>
          c ? (
            <div
              key={c.name}
              className={`rounded-2xl border-2 p-3 flex flex-col items-center transition ${
                running && showing === i ? "border-wood-600 bg-wood-50" : "border-navy-100 bg-ivory-50"
              }`}
            >
              <p className="text-xl font-bold text-ink-900">{c.name}</p>
              <ChordDiagram chord={c} />
            </div>
          ) : null
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 mt-5">
        <div className="text-center">
          <div className={`text-4xl font-bold tabular ${left <= 10 && running ? "text-coral-600" : "text-ink-900"}`}>
            {left}s
          </div>
          <div className="text-xs text-ink-500">còn lại</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold tabular text-wood-700">{count}</div>
          <div className="text-xs text-ink-500">lần đổi</div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-5">
        {running ? (
          <>
            <button type="button" onClick={tap} className="rounded-2xl bg-navy-950 hover:bg-navy-900 text-white font-bold px-10 py-5 text-lg transition select-none">
              Đổi xong (phím cách)
            </button>
            <button type="button" onClick={finish} className={`${btn.secondary} py-2.5`}>
              Dừng sớm
            </button>
          </>
        ) : (
          <button type="button" onClick={start} className={`${btn.primary} py-2.5`} disabled={a === b}>
            Bắt đầu 60 giây
          </button>
        )}
      </div>

      {result && !running && (
        <p className="text-center text-sm text-ink-600 mt-4">
          {result.count >= 60
            ? "Trên 60 lần một phút — đổi hợp âm đã thành phản xạ, ghép vào bài được rồi."
            : result.count >= 30
              ? `${result.count} lần. Mốc nên nhắm là 60. Tập cặp này mỗi ngày 1 phút.`
              : `${result.count} lần. Đừng vội — mắt nhìn hình, tay đặt ngón xong mới đếm. Số sẽ lên nhanh.`}
          {result.count === result.best && result.count > 0 && " Kỷ lục mới!"}
        </p>
      )}
    </div>
  );
}
