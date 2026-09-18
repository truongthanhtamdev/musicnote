"use client";

import { useState } from "react";
import { PIANO_CHORDS, PIANO_CHORD_BY_NAME, PIANO_PROGRESSIONS } from "@/lib/piano-chords";
import { playPianoChord } from "@/lib/audio";
import { PianoKeys } from "@/components/piano-keys";
import { IconSpeaker } from "@/components/icons";

/**
 * Hợp âm piano tông Đô: bấm tên hợp âm là thấy phím tô sáng và nghe tiếng.
 * Có luôn mấy vòng hay dùng — bấm từng hợp âm theo thứ tự là đã nghe ra
 * "cái vòng" mà bài hát đang chạy.
 */
export default function PianoChords() {
  const [active, setActive] = useState(PIANO_CHORDS[0].name);
  const chord = PIANO_CHORD_BY_NAME.get(active) ?? PIANO_CHORDS[0];

  function pick(name: string) {
    setActive(name);
    const c = PIANO_CHORD_BY_NAME.get(name);
    if (c) playPianoChord([c.bass, ...c.steps]);
  }

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5">
      <div className="flex flex-wrap gap-2">
        {PIANO_CHORDS.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => pick(c.name)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${
              active === c.name ? "border-wood-600 bg-wood-600 text-white" : "border-navy-200 bg-white text-ink-700 hover:border-wood-300"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-4">
        <p className="text-xl font-bold text-ink-900">{chord.name} — {chord.fullName}</p>
        <p className="text-sm text-ink-600">Tay phải: <span className="font-semibold text-ink-900">{chord.noteNames}</span> · tay trái: nốt {chord.noteNames.split(" – ")[0]} thấp hơn một quãng tám</p>
        <button type="button" onClick={() => pick(chord.name)} className="inline-flex items-center gap-1 text-sm font-semibold text-wood-700 hover:text-wood-800">
          <IconSpeaker className="w-4 h-4" /> Nghe lại
        </button>
      </div>

      <div className="overflow-x-auto scroll-thin mt-3">
        <PianoKeys steps={[chord.bass, ...chord.steps]} octaves={3} fromStep={-7} />
      </div>

      <div className="mt-5 border-t border-navy-100 pt-4">
        <p className="font-semibold text-ink-900">Vòng hay dùng — bấm từng hợp âm theo thứ tự</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {PIANO_PROGRESSIONS.map((p) => (
            <div key={p.name} className="rounded-xl bg-ivory-50 border border-navy-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink-900">{p.name}</span>
                <span className="text-xs text-ink-500">{p.feel}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {p.chords.map((n, i) => (
                  <button key={n + i} type="button" onClick={() => pick(n)} className="rounded-lg bg-white border border-navy-200 hover:border-wood-400 px-3 py-1.5 text-sm font-bold text-ink-800 transition">
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-500 mt-4">
        Bảy hợp âm tông Đô toàn phím trắng nên bấm được ngay buổi đầu. Sang tông khác là dời cả
        bàn tay, giữ nguyên hình dạng — chuyện của những buổi sau.
      </p>
    </div>
  );
}
