"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { PLATFORM_LABELS, clipEmbedUrl, clipThumbnail, type ClipRow } from "@/lib/clip-url";
import { IconPlay } from "./icons";

/**
 * Khung phát clip. Chưa bấm thì chỉ là ảnh bìa + nút phát; bấm mới tải trình
 * phát của YouTube/TikTok/Facebook — trang chủ có 6 clip mà tải cả 6 trình
 * phát ngay thì chậm hẳn, nhất là trên điện thoại.
 */
export function ClipPlayer({ clip }: { clip: Pick<ClipRow, "platform" | "video_id" | "url" | "vertical" | "title"> }) {
  const [playing, setPlaying] = useState(false);
  const thumb = clipThumbnail(clip);
  const aspect = clip.vertical ? "aspect-[9/16]" : "aspect-video";

  if (playing) {
    return (
      <iframe
        src={clipEmbedUrl(clip)}
        title={clip.title || `Clip học viên trên ${PLATFORM_LABELS[clip.platform]}`}
        className={`w-full ${aspect} rounded-xl bg-black`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setPlaying(true);
        trackEvent("xem_clip", { platform: clip.platform });
      }}
      aria-label={`Phát clip${clip.title ? `: ${clip.title}` : ""}`}
      className={`group relative block w-full ${aspect} overflow-hidden rounded-xl bg-navy-950`}
    >
      <span className="absolute inset-0 bg-gradient-to-br from-navy-800 to-navy-950" />
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh bìa từ YouTube, không qua bộ tối ưu ảnh
        <img
          src={thumb}
          alt=""
          loading="lazy"
          onError={(e) => (e.currentTarget.style.display = "none")}
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
        />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-14 h-14 rounded-full bg-coral-600 group-hover:bg-coral-700 text-white flex items-center justify-center shadow-lg transition">
          <IconPlay className="w-6 h-6 translate-x-0.5" />
        </span>
      </span>
      <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {PLATFORM_LABELS[clip.platform]}
      </span>
    </button>
  );
}
