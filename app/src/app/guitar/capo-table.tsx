"use client";

import { useState } from "react";
import { CHROMATIC, MAX_CAPO, OPEN_SHAPES, capoFor, keyLabel, soundingChord } from "@/lib/capo";

/**
 * Bảng capo hai chiều: tra "kẹp ngăn này bấm thế này ra tông gì", và công cụ
 * ngược "muốn tông này, bấm thế này thì kẹp ngăn mấy".
 */
export default function CapoTable() {
  const [target, setTarget] = useState<string>("Eb");
  const [shape, setShape] = useState<string>("D");
  const fret = capoFor(shape, target);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-navy-100 bg-white p-5">
        <p className="font-semibold text-ink-900">Muốn ra tông nào, bấm thế nào?</p>
        <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
          <span className="text-ink-600">Bài ở tông</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Tông bài hát" className="rounded-xl border border-navy-200 bg-white px-3 py-2 font-semibold">
            {CHROMATIC.map((k) => (
              <option key={k} value={k}>{k} — {keyLabel(k)}</option>
            ))}
          </select>
          <span className="text-ink-600">, mình muốn bấm thế</span>
          <select value={shape} onChange={(e) => setShape(e.target.value)} aria-label="Thế bấm" className="rounded-xl border border-navy-200 bg-white px-3 py-2 font-semibold">
            {OPEN_SHAPES.filter((s) => !s.endsWith("m")).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-ink-900">
          {fret == null ? (
            <span className="text-coral-700 font-semibold">
              Phải kẹp cao hơn ngăn {MAX_CAPO} — đổi thế bấm khác gần tông hơn.
            </span>
          ) : fret === 0 ? (
            <span className="font-semibold">Không cần capo, bấm thẳng thế {shape}.</span>
          ) : (
            <>
              <span className="text-2xl font-bold text-wood-700">Capo ngăn {fret}</span>
              <span className="text-ink-600"> rồi bấm thế {shape} → nghe ra tông {target}.</span>
            </>
          )}
        </p>
        <p className="text-xs text-ink-500 mt-2">
          Cùng một tông kẹp được nhiều cách; chọn thế nào mà cả bài toàn hợp âm mở dễ bấm là được.
        </p>
      </div>

      <div className="rounded-2xl border border-navy-100 bg-white p-5 overflow-x-auto scroll-thin">
        <p className="font-semibold text-ink-900">Bảng tra: kẹp ngăn này, bấm thế này → ra tông gì</p>
        <table className="mt-3 text-sm min-w-[560px] w-full">
          <thead>
            <tr className="text-left text-ink-500">
              <th className="py-1.5 pr-3 font-semibold">Capo</th>
              {OPEN_SHAPES.map((s) => (
                <th key={s} className="py-1.5 px-2 font-bold text-ink-900 text-center">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: MAX_CAPO + 1 }, (_, f) => (
              <tr key={f} className="border-t border-navy-100">
                <td className="py-1.5 pr-3 font-semibold text-ink-700 whitespace-nowrap">
                  {f === 0 ? "Không" : `Ngăn ${f}`}
                </td>
                {OPEN_SHAPES.map((s) => (
                  <td key={s} className="py-1.5 px-2 text-center tabular text-ink-800">
                    {soundingChord(s, f)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-ink-500 mt-3">
          Đọc theo hàng: capo ngăn 2, bấm thế C thì nghe ra D; bấm thế Am thì ra Bm. Thế bấm không
          đổi, chỉ có tên tông là dịch lên.
        </p>
      </div>
    </div>
  );
}
