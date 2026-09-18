"use client";

import { useEffect, useState } from "react";
import { CHORDS, type ChordShape } from "@/lib/guitar";
import { playGuitarChord, warmGuitar } from "@/lib/audio";
import { readBest, saveBest, shuffle } from "@/lib/best-score";
import { ChordDiagram } from "@/components/chord-diagram";
import { IconCheckCircle, IconSpeaker, IconX } from "@/components/icons";
import { btn } from "@/components/ui";

const ROUND = 15;
const BEST_KEY = "musicnote-chord-quiz-best";

/** Chỉ hỏi hợp âm mở và hợp âm 7 — hợp âm chặn nhìn giống nhau, đoán bằng mắt không ra. */
const POOL = CHORDS.filter((c) => c.group === "major" || c.group === "minor" || c.group === "seventh");

interface Q {
  chord: ChordShape;
  options: string[];
}

function makeQuestion(avoid?: string): Q {
  let chord = POOL[Math.floor(Math.random() * POOL.length)];
  for (let i = 0; i < 10 && chord.name === avoid; i++) chord = POOL[Math.floor(Math.random() * POOL.length)];
  // Đáp án nhiễu lấy cùng nhóm cho khó vừa phải: hỏi Am thì nhiễu là Em, Dm…
  const same = POOL.filter((c) => c.group === chord.group && c.name !== chord.name);
  const others = POOL.filter((c) => c.group !== chord.group);
  const pick = shuffle(same).slice(0, 3);
  while (pick.length < 3) pick.push(others[Math.floor(Math.random() * others.length)]);
  return { chord, options: shuffle([chord.name, ...pick.map((c) => c.name)]) };
}

/**
 * Game đoán hợp âm: nhìn hình thế bấm, chọn tên. Chiều ngược của tra cứu —
 * tra cứu là "biết tên, xem hình", còn đây là "thấy hình, nhớ tên" — cái thứ
 * hai mới là cái cần khi nhìn bản hợp âm mà tay phải bấm ngay.
 */
export default function ChordQuiz() {
  const [q, setQ] = useState<Q | null>(null);
  useEffect(warmGuitar, []);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  function start() {
    setBest(readBest(BEST_KEY));
    setScore(0);
    setDone(0);
    setFinished(false);
    setPicked(null);
    setQ(makeQuestion());
  }

  function answer(name: string) {
    if (!q || picked) return;
    const correct = name === q.chord.name;
    setPicked(name);
    playGuitarChord(q.chord.frets, "strum");
    const nextScore = correct ? score + 1 : score;
    const nextDone = done + 1;
    setScore(nextScore);
    setDone(nextDone);
    window.setTimeout(() => {
      setPicked(null);
      if (nextDone >= ROUND) {
        setFinished(true);
        setBest(saveBest(BEST_KEY, nextScore));
      } else {
        setQ((prev) => makeQuestion(prev?.chord.name));
      }
    }, correct ? 700 : 1500);
  }

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold text-ink-900 text-lg">Game: hợp âm này tên gì?</p>
          <p className="text-sm text-ink-500 mt-0.5">Nhìn thế bấm, chọn tên. {ROUND} câu mỗi lượt, có tiếng để nghe lại.</p>
        </div>
        {best != null && (
          <span className="text-sm text-ink-500">
            Kỷ lục: <span className="font-bold text-ink-900">{best}/{ROUND}</span>
          </span>
        )}
      </div>

      {!q ? (
        <div className="text-center py-8">
          <button type="button" onClick={start} className={`${btn.primary} py-2.5`}>
            Bắt đầu
          </button>
        </div>
      ) : finished ? (
        <div className="text-center py-8">
          <p className="text-5xl font-bold text-ink-900 tabular">
            {score}
            <span className="text-2xl text-ink-400">/{ROUND}</span>
          </p>
          <p className="text-ink-600 mt-2">
            {score >= 13
              ? "Nhìn là biết tên, tốt lắm. Thử sang bài tập chuyển hợp âm."
              : score >= 9
                ? "Khá rồi. Mấy hợp âm hay nhầm thì mở lại phần tra cứu xem kỹ ngón."
                : "Chưa sao — tập nhóm hợp âm trưởng trước, quen rồi mới sang thứ và 7."}
          </p>
          <button type="button" onClick={start} className={`${btn.primary} py-2.5 mt-5`}>
            Chơi lại
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-ink-500 mt-4">
            <span>
              Câu <span className="font-semibold text-ink-900">{Math.min(done + 1, ROUND)}</span>/{ROUND}
            </span>
            <span>
              Đúng <span className="font-semibold text-mint-700">{score}</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-ivory-100 mt-2 overflow-hidden">
            <div className="h-full bg-wood-500 transition-all" style={{ width: `${(done / ROUND) * 100}%` }} />
          </div>

          <div className="flex flex-col items-center my-5">
            <ChordDiagram chord={q.chord} size={1.25} />
            <button
              type="button"
              onClick={() => playGuitarChord(q.chord.frets, "arpeggio")}
              className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900 mt-2"
            >
              <IconSpeaker className="w-4 h-4" />
              Nghe rải
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {q.options.map((name) => {
              const isAnswer = picked && name === q.chord.name;
              const isPicked = picked === name;
              return (
                <button
                  key={name}
                  type="button"
                  disabled={!!picked}
                  onClick={() => answer(name)}
                  className={`rounded-xl border py-3 text-lg font-bold transition ${
                    isAnswer
                      ? "border-mint-600 bg-mint-600 text-white"
                      : isPicked
                        ? "border-coral-500 bg-coral-500 text-white"
                        : "border-navy-200 bg-white text-ink-800 hover:border-wood-400 disabled:opacity-60"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>

          <div className="h-6 mt-3 text-center text-sm">
            {picked &&
              (picked === q.chord.name ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-mint-700">
                  <IconCheckCircle className="w-4 h-4" /> Chính xác!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold text-coral-600">
                  <IconX className="w-4 h-4" /> Đây là {q.chord.name} — {q.chord.fullName}
                </span>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
