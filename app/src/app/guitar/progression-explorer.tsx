"use client";

import { useState } from "react";
import {
  CHORD_BY_NAME,
  KEYS,
  MINOR_DOMINANT_SWAP,
  PROGRESSIONS,
  chordsOfProgression,
} from "@/lib/guitar";
import { ChordDiagram } from "@/components/chord-diagram";
import { IconChevronRight } from "@/components/icons";

/**
 * Vòng hòa thanh theo tông. Đổi tông là cả trang đổi theo — đúng cách người
 * đệm hát làm việc: bài này tông Sol thì vòng 1-5-6-4 gồm những hợp âm nào.
 */
export default function ProgressionExplorer() {
  const [keyName, setKeyName] = useState("C");
  const key = KEYS.find((k) => k.name === keyName) ?? KEYS[0];
  const shown = PROGRESSIONS.filter((p) => p.mode === key.mode);

  return (
    <div>
      <p className="text-sm font-semibold text-ink-700">Chọn tông của bài</p>
      <div className="flex flex-wrap gap-2 mt-2">
        {KEYS.map((k) => (
          <button
            key={k.name}
            type="button"
            onClick={() => setKeyName(k.name)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
              k.name === key.name
                ? "border-wood-600 bg-wood-600 text-white"
                : "border-navy-200 bg-white text-ink-600 hover:border-wood-300"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Bảy hợp âm của tông: nhìn một lần là biết bài tông này quanh quẩn
          những hợp âm nào, khỏi đoán mò khi bắt bài. */}
      <div className="mt-6 rounded-2xl border border-navy-100 bg-ivory-50 p-4 sm:p-5">
        <p className="font-semibold text-ink-900">Hợp âm của tông {key.label}</p>
        <p className="text-sm text-ink-500 mt-0.5">
          Gần như mọi hợp âm trong một bài đều nằm trong bảy hợp âm này.
        </p>
        <div className="overflow-x-auto scroll-thin -mx-1 px-1 mt-3">
          <div className="flex gap-2 min-w-max">
            {key.chords.map((name, i) => {
              const dim = name.endsWith("dim");
              return (
                <div
                  key={name}
                  className={`rounded-xl border px-3 py-2 text-center min-w-[74px] ${
                    dim ? "border-navy-100 bg-white/60" : "border-navy-100 bg-white"
                  }`}
                >
                  <p className="text-[11px] font-semibold text-wood-600">Bậc {i + 1}</p>
                  <p className={`font-bold ${dim ? "text-ink-400" : "text-ink-900"}`}>{name}</p>
                  {dim && <p className="text-[10px] text-ink-400">ít dùng</p>}
                </div>
              );
            })}
          </div>
        </div>
        {key.mode === "minor" && MINOR_DOMINANT_SWAP[key.name] && (
          <p className="text-xs text-ink-600 mt-3">
            Mẹo: ở tông thứ, người ta hay thay bậc 5 ({key.chords[4]}) bằng{" "}
            <span className="font-semibold">{MINOR_DOMINANT_SWAP[key.name]}</span> cho câu nhạc về
            chủ âm dứt khoát hơn.
          </p>
        )}
      </div>

      <div className="space-y-4 mt-6">
        {shown.map((p) => {
          const chords = chordsOfProgression(p, key);
          return (
            <div key={p.id} className="rounded-2xl border border-navy-100 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-lg font-bold text-ink-900">{p.name}</h3>
                <span className="text-xs font-semibold text-wood-600">{p.feel}</span>
              </div>
              <p className="text-sm text-ink-600 mt-1">{p.description}</p>

              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {chords.map((name, i) => (
                  <span key={`${name}-${i}`} className="flex items-center gap-1.5">
                    <span className="rounded-lg bg-navy-950 text-white font-bold px-3 py-1.5 text-sm">
                      {name}
                    </span>
                    {i < chords.length - 1 && (
                      <IconChevronRight className="w-3.5 h-3.5 text-ink-300" />
                    )}
                  </span>
                ))}
              </div>

              <div className="overflow-x-auto scroll-thin -mx-1 px-1 mt-4">
                <div className="flex gap-3 min-w-max">
                  {[...new Set(chords)].map((name) => {
                    const shape = CHORD_BY_NAME.get(name);
                    return shape ? (
                      <div key={name} className="text-center">
                        <p className="text-sm font-bold text-ink-900 mb-1">{name}</p>
                        <ChordDiagram chord={shape} size={0.85} />
                      </div>
                    ) : (
                      <div
                        key={name}
                        className="w-[100px] rounded-xl border border-dashed border-navy-200 grid place-content-center text-center p-2"
                      >
                        <p className="text-sm font-bold text-ink-900">{name}</p>
                        <p className="text-[11px] text-ink-400 mt-1">Chưa có hình</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
