"use client";

import { useState } from "react";
import { CHORDS, CHORD_GROUPS, type ChordGroup } from "@/lib/guitar";
import { foldVietnamese } from "@/lib/format";
import { ChordDiagram } from "@/components/chord-diagram";
import { IconSearch } from "@/components/icons";

/**
 * Tra cứu thế bấm. Lọc theo nhóm và gõ tìm — người mới thường vào đây với
 * đúng một câu hỏi trong đầu ("bấm F sao?"), nên ô tìm kiếm đặt ngay trên đầu.
 */
export default function ChordLibrary() {
  const [group, setGroup] = useState<ChordGroup | "all">("all");
  const [q, setQ] = useState("");

  const needle = foldVietnamese(q.trim());
  const shown = CHORDS.filter((c) => {
    if (group !== "all" && c.group !== group) return false;
    if (!needle) return true;
    return (
      foldVietnamese(c.name).includes(needle) || foldVietnamese(c.fullName).includes(needle)
    );
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[200px]">
          <IconSearch className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm hợp âm: Am, F, rê thứ…"
            aria-label="Tìm hợp âm"
            className="w-full rounded-xl border border-navy-200 bg-white pl-9 pr-3 py-2.5 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <Chip active={group === "all"} onClick={() => setGroup("all")}>
          Tất cả ({CHORDS.length})
        </Chip>
        {CHORD_GROUPS.map((g) => (
          <Chip key={g.value} active={group === g.value} onClick={() => setGroup(g.value)}>
            {g.label}
          </Chip>
        ))}
      </div>

      {group !== "all" && (
        <p className="text-sm text-ink-500 mt-3">
          {CHORD_GROUPS.find((g) => g.value === group)?.hint}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="text-sm text-ink-500 mt-6">
          Không có hợp âm nào khớp. Thử gõ tên tiếng Anh (VD <b>Am</b>) hoặc tiếng Việt (VD{" "}
          <b>la thứ</b>).
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {shown.map((c) => (
            <div
              key={c.name}
              className="rounded-2xl border border-navy-100 bg-white p-4 flex flex-col items-center text-center"
            >
              <p className="text-lg font-bold text-ink-900">{c.name}</p>
              <p className="text-xs text-ink-500 mb-2">{c.fullName}</p>
              <ChordDiagram chord={c} />
              {c.tip && <p className="text-xs text-ink-600 mt-2 leading-relaxed">{c.tip}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
        active
          ? "border-wood-600 bg-wood-600 text-white"
          : "border-navy-200 bg-white text-ink-600 hover:border-wood-300"
      }`}
    >
      {children}
    </button>
  );
}
