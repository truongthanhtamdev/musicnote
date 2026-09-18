"use client";

import { useEffect, useState } from "react";
import { NOTE_NAMES, noteNameOfStep } from "@/lib/piano";
import { playPianoStep, warmPiano } from "@/lib/audio";
import { readBest, saveBest } from "@/lib/best-score";
import { IconCheckCircle, IconSpeaker, IconX } from "@/components/icons";
import { btn } from "@/components/ui";

type Mode = "cao-thap" | "doan-not";
const ROUND = 20;
const keyFor = (m: Mode) => `musicnote-ear-${m}`;

interface Q {
  ref: number;
  target: number;
}

function makeQuestion(mode: Mode): Q {
  if (mode === "cao-thap") {
    // Hai nốt cách nhau 1–5 bậc trong quãng Đô giữa → Đô cao, không bao giờ bằng nhau.
    const ref = Math.floor(Math.random() * 8);
    let target = ref;
    while (target === ref) target = Math.max(0, Math.min(7, ref + (Math.floor(Math.random() * 11) - 5)));
    return { ref, target };
  }
  // Đoán nốt: luôn phát Đô giữa làm mốc, rồi một nốt trong quãng tám đó.
  return { ref: 0, target: Math.floor(Math.random() * 7) };
}

function playPair(q: Q) {
  playPianoStep(q.ref, 0.9);
  window.setTimeout(() => playPianoStep(q.target, 1.2), 750);
}

/**
 * Luyện tai. Hai mức: "cao hơn hay thấp hơn" cho người chưa từng luyện, rồi
 * "nghe Đô, đoán nốt" — mức mà học viên piano cần để đàn lại được giai điệu
 * vừa nghe.
 */
export default function EarTraining() {
  const [mode, setMode] = useState<Mode>("cao-thap");
  useEffect(warmPiano, []);
  const [q, setQ] = useState<Q | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  function start(m: Mode) {
    setMode(m);
    setBest(readBest(keyFor(m)));
    setScore(0);
    setDone(0);
    setFinished(false);
    setPicked(null);
    const nq = makeQuestion(m);
    setQ(nq);
    playPair(nq);
  }

  function correctAnswer(question: Q): string {
    return mode === "cao-thap" ? (question.target > question.ref ? "Cao hơn" : "Thấp hơn") : noteNameOfStep(question.target);
  }

  function answer(choice: string) {
    if (!q || picked) return;
    const right = choice === correctAnswer(q);
    setPicked(choice);
    if (!right) playPianoStep(q.target, 1.2);
    const nextScore = right ? score + 1 : score;
    const nextDone = done + 1;
    setScore(nextScore);
    setDone(nextDone);
    window.setTimeout(() => {
      setPicked(null);
      if (nextDone >= ROUND) {
        setFinished(true);
        setBest(saveBest(keyFor(mode), nextScore));
      } else {
        const nq = makeQuestion(mode);
        setQ(nq);
        playPair(nq);
      }
    }, right ? 700 : 1600);
  }

  const options = mode === "cao-thap" ? ["Thấp hơn", "Cao hơn"] : [...NOTE_NAMES];

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["cao-thap", "Cao hơn hay thấp hơn?"],
              ["doan-not", "Nghe Đô, đoán nốt"],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => start(m)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                mode === m && q ? "border-wood-600 bg-wood-600 text-white" : "border-navy-200 bg-white text-ink-600 hover:border-wood-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {best != null && (
          <span className="text-sm text-ink-500">
            Kỷ lục: <span className="font-bold text-ink-900">{best}/{ROUND}</span>
          </span>
        )}
      </div>

      {!q ? (
        <div className="text-center py-8">
          <p className="text-ink-600">Chọn mức bên trên. Bật loa lên — game này chỉ dùng tai.</p>
          <p className="text-xs text-ink-500 mt-2">
            Mức 1: nghe hai nốt, nốt sau cao hơn hay thấp hơn nốt trước. Mức 2: nghe Đô rồi một nốt nữa, đoán tên nốt đó.
          </p>
        </div>
      ) : finished ? (
        <div className="text-center py-8">
          <p className="text-5xl font-bold text-ink-900 tabular">
            {score}<span className="text-2xl text-ink-400">/{ROUND}</span>
          </p>
          <p className="text-ink-600 mt-2">
            {score >= 17
              ? mode === "cao-thap" ? "Tai tốt. Sang mức 'Nghe Đô, đoán nốt' đi." : "Nghe là biết nốt — đàn lại giai điệu vừa nghe được rồi."
              : score >= 12
                ? "Khá. Luyện mỗi ngày một lượt, tai lên rất nhanh."
                : "Bình thường thôi — tai cần thời gian hơn mắt. Vừa nghe vừa hát theo nốt sẽ nhanh hơn."}
          </p>
          <button type="button" onClick={() => start(mode)} className={`${btn.primary} py-2.5 mt-5`}>Chơi lại</button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-ink-500 mt-5">
            <span>Câu <span className="font-semibold text-ink-900">{Math.min(done + 1, ROUND)}</span>/{ROUND}</span>
            <span>Đúng <span className="font-semibold text-mint-700">{score}</span></span>
          </div>
          <div className="h-1.5 rounded-full bg-ivory-100 mt-2 overflow-hidden">
            <div className="h-full bg-wood-500 transition-all" style={{ width: `${(done / ROUND) * 100}%` }} />
          </div>

          <div className="flex justify-center my-6">
            <button type="button" onClick={() => playPair(q)} className="inline-flex items-center gap-2 rounded-2xl bg-navy-950 hover:bg-navy-900 text-white font-semibold px-6 py-4 transition">
              <IconSpeaker className="w-5 h-5" />
              Nghe lại
            </button>
          </div>

          <div className={`grid gap-2 ${mode === "cao-thap" ? "grid-cols-2" : "grid-cols-4 sm:grid-cols-7"}`}>
            {options.map((o) => {
              const isAnswer = picked && o === correctAnswer(q);
              const isPicked = picked === o;
              return (
                <button
                  key={o}
                  type="button"
                  disabled={!!picked}
                  onClick={() => answer(o)}
                  className={`rounded-xl border py-3 font-bold transition ${
                    isAnswer ? "border-mint-600 bg-mint-600 text-white"
                      : isPicked ? "border-coral-500 bg-coral-500 text-white"
                        : "border-navy-200 bg-white text-ink-800 hover:border-wood-400 disabled:opacity-60"
                  }`}
                >
                  {o}
                </button>
              );
            })}
          </div>

          <div className="h-6 mt-3 text-center text-sm">
            {picked &&
              (picked === correctAnswer(q) ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-mint-700"><IconCheckCircle className="w-4 h-4" /> Chính xác!</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold text-coral-600"><IconX className="w-4 h-4" /> Đáp án: {correctAnswer(q)}</span>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
