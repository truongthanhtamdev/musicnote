"use client";

import { useCallback, useState } from "react";
import {
  CLEFS,
  NOTE_NAMES,
  gameSteps,
  noteLabel,
  noteNameOfStep,
  type ClefName,
} from "@/lib/piano";
import { MusicStaff } from "@/components/music-staff";
import { IconCheckCircle, IconX } from "@/components/icons";
import { btn } from "@/components/ui";

type Mode = ClefName | "both";
const ROUND_LENGTH = 20;
const BEST_KEY = "musicnote-note-game-best";

function readBest(): number | null {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    return raw ? Number(raw) || null : null;
  } catch {
    return null;
  }
}

interface Question {
  clef: ClefName;
  step: number;
}

function randomQuestion(mode: Mode, avoid?: Question): Question {
  const steps = gameSteps(mode);
  for (let i = 0; i < 20; i++) {
    const step = steps[Math.floor(Math.random() * steps.length)];
    // Nốt nằm trong tầm của khóa nào thì vẽ trên khuông đó; Đô giữa thuộc cả
    // hai nên bốc ngẫu nhiên để người chơi gặp đủ hai kiểu.
    const canSol = step >= CLEFS.sol.gameRange.from && step <= CLEFS.sol.gameRange.to;
    const canFa = step >= CLEFS.fa.gameRange.from && step <= CLEFS.fa.gameRange.to;
    const clef: ClefName =
      mode !== "both" ? mode : canSol && canFa ? (Math.random() < 0.5 ? "sol" : "fa") : canSol ? "sol" : "fa";
    if (!avoid || avoid.step !== step || avoid.clef !== clef) return { clef, step };
  }
  return { clef: mode === "both" ? "sol" : mode, step: 0 };
}

/**
 * Game đọc nốt: hiện một nốt, người chơi bấm tên nốt.
 *
 * Mỗi lượt 20 câu chứ không chơi vô tận — có điểm dừng thì người ta chơi hết
 * lượt rồi quay lại hôm sau, còn chơi mãi thì bỏ giữa chừng. Kỷ lục lưu ngay
 * trong máy người chơi, không cần tài khoản.
 */
export default function NoteGame() {
  const [mode, setMode] = useState<Mode>("sol");
  const [question, setQuestion] = useState<Question | null>(null);
  const [answered, setAnswered] = useState<{ picked: string; correct: boolean } | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const start = useCallback((next: Mode) => {
    // Đọc kỷ lục lúc bấm bắt đầu chứ không đọc trong effect: máy chủ không có
    // localStorage, mà đọc trong effect thì React phải vẽ lại trang một lần
    // nữa cho mỗi lượt.
    setBest(readBest());
    setMode(next);
    setScore(0);
    setDone(0);
    setFinished(false);
    setAnswered(null);
    setQuestion(randomQuestion(next));
  }, []);

  function answer(name: string) {
    if (!question || answered) return;
    const correct = noteNameOfStep(question.step) === name;
    setAnswered({ picked: name, correct });
    const nextScore = correct ? score + 1 : score;
    const nextDone = done + 1;
    setScore(nextScore);
    setDone(nextDone);

    setTimeout(() => {
      setAnswered(null);
      if (nextDone >= ROUND_LENGTH) {
        setFinished(true);
        const previous = readBest();
        if (previous == null || nextScore > previous) {
          setBest(nextScore);
          try {
            localStorage.setItem(BEST_KEY, String(nextScore));
          } catch {
            // Trình duyệt chặn lưu trữ (chế độ ẩn danh) thì vẫn hiện kỷ lục
            // trong phiên này, chỉ là không nhớ sang lần sau.
          }
        } else {
          setBest(previous);
        }
      } else {
        setQuestion((q) => randomQuestion(mode, q ?? undefined));
      }
    }, correct ? 550 : 1300);
  }

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["sol", "Khóa Sol"],
              ["fa", "Khóa Fa"],
              ["both", "Cả hai khóa"],
            ] as [Mode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => start(value)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                mode === value && question
                  ? "border-wood-600 bg-wood-600 text-white"
                  : "border-navy-200 bg-white text-ink-600 hover:border-wood-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {best != null && (
          <span className="text-sm text-ink-500">
            Kỷ lục: <span className="font-bold text-ink-900">{best}/{ROUND_LENGTH}</span>
          </span>
        )}
      </div>

      {!question ? (
        <div className="text-center py-10">
          <p className="text-ink-600">Chọn khóa nhạc bên trên để bắt đầu — mỗi lượt 20 nốt.</p>
        </div>
      ) : finished ? (
        <div className="text-center py-8">
          <p className="text-5xl font-bold text-ink-900 tabular">
            {score}
            <span className="text-2xl text-ink-400">/{ROUND_LENGTH}</span>
          </p>
          <p className="text-ink-600 mt-2">
            {score >= 18
              ? "Quá tốt! Bạn đọc nốt gần như tự động rồi."
              : score >= 13
                ? "Khá rồi đó. Chơi thêm vài lượt là bật ra ngay."
                : "Chưa sao cả — đọc lại hai chuỗi nốt ở trên rồi chơi tiếp nhé."}
          </p>
          <button type="button" onClick={() => start(mode)} className={`${btn.primary} py-2.5 mt-5`}>
            Chơi lại
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-ink-500 mt-5">
            <span>
              Câu <span className="font-semibold text-ink-900">{Math.min(done + 1, ROUND_LENGTH)}</span>
              /{ROUND_LENGTH}
            </span>
            <span>
              Đúng <span className="font-semibold text-mint-700">{score}</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-ivory-100 mt-2 overflow-hidden">
            <div
              className="h-full bg-wood-500 transition-all"
              style={{ width: `${(done / ROUND_LENGTH) * 100}%` }}
            />
          </div>

          <div className="flex justify-center my-6">
            <MusicStaff
              clef={question.clef}
              step={question.step}
              highlight={answered ? (answered.correct ? "right" : "wrong") : undefined}
            />
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {NOTE_NAMES.map((name) => {
              const isAnswer = answered && noteNameOfStep(question.step) === name;
              const isPicked = answered?.picked === name;
              return (
                <button
                  key={name}
                  type="button"
                  disabled={!!answered}
                  onClick={() => answer(name)}
                  className={`rounded-xl border py-3 font-bold transition ${
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
            {answered &&
              (answered.correct ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-mint-700">
                  <IconCheckCircle className="w-4 h-4" />
                  Chính xác!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold text-coral-600">
                  <IconX className="w-4 h-4" />
                  Nốt này là {noteLabel(question.step)}
                </span>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
