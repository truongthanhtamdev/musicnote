"use client";

import { useEffect, useState } from "react";
import { audioSupported, playGuitarChord, warmGuitar } from "@/lib/audio";
import { IconSpeaker } from "@/components/icons";

/**
 * Nút nghe một hợp âm guitar. Hai kiểu: quạt một nhát, hoặc rải từng dây để
 * nghe từng nốt rõ ràng — người mới hay dùng cách rải để dò xem dây nào mình
 * bấm chưa kêu.
 */
export function ChordPlayButton({ frets, compact = false }: { frets: number[]; compact?: boolean }) {
  // Chỉ biết có Web Audio hay không sau khi lên trình duyệt; máy chủ luôn
  // render nút để HTML hai bên khớp nhau, rồi ẩn đi nếu không hỗ trợ.
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc năng lực trình duyệt, chỉ chạy một lần sau khi mount
    setSupported(audioSupported());
    warmGuitar();
  }, []);
  if (!supported) return null;

  const base =
    "inline-flex items-center gap-1 rounded-lg border border-navy-200 bg-white hover:bg-ivory-100 text-ink-700 font-semibold transition";
  return (
    <div className="inline-flex gap-1.5">
      <button
        type="button"
        onClick={() => playGuitarChord(frets, "strum")}
        className={`${base} ${compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"}`}
        title="Quạt một nhát"
      >
        <IconSpeaker className="w-4 h-4" />
        Nghe
      </button>
      <button
        type="button"
        onClick={() => playGuitarChord(frets, "arpeggio")}
        className={`${base} ${compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"}`}
        title="Rải từng dây, nghe rõ từng nốt"
      >
        Rải
      </button>
    </div>
  );
}
