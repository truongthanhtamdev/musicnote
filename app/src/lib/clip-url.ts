/**
 * Phần xử lý link clip không đụng tới database — dùng được cả ở trình duyệt
 * (khung phát clip) lẫn máy chủ.
 */
export type ClipPlatform = "youtube" | "tiktok" | "facebook";

export interface ClipRow {
  id: number;
  url: string;
  platform: ClipPlatform;
  video_id: string;
  /** 1 với Shorts/TikTok/Reels — khung dọc 9:16 thay vì 16:9. */
  vertical: number;
  title: string | null;
  subject: string | null;
  /** Chỉ hiện ở trang chủ khi học viên/phụ huynh đã đồng ý. */
  is_public: number;
  created_by: number | null;
  created_at: string;
}

export interface ParsedClip {
  platform: ClipPlatform;
  videoId: string;
  vertical: boolean;
  /** Link gốc đã chuẩn hoá, dùng cho nút "Xem trên kênh". */
  url: string;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Nhận link clip dán từ app YouTube/TikTok/Facebook và rút ra mã video để
 * nhúng. Link rút gọn (vt.tiktok.com, fb.watch) phải mở ra link đầy đủ trước
 * — xem `resolveShortLink`.
 */
export function parseClipUrl(raw: string): ParsedClip | null {
  let u: URL;
  try {
    u = new URL(raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m|vm|vt)\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtu.be" && YT_ID.test(parts[0] ?? "")) {
    return { platform: "youtube", videoId: parts[0], vertical: false, url: `https://youtu.be/${parts[0]}` };
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = u.searchParams.get("v");
    if (v && YT_ID.test(v)) {
      return { platform: "youtube", videoId: v, vertical: false, url: `https://www.youtube.com/watch?v=${v}` };
    }
    if (["shorts", "live", "embed"].includes(parts[0]) && YT_ID.test(parts[1] ?? "")) {
      const vertical = parts[0] === "shorts";
      return {
        platform: "youtube",
        videoId: parts[1],
        vertical,
        url: vertical ? `https://www.youtube.com/shorts/${parts[1]}` : `https://www.youtube.com/watch?v=${parts[1]}`,
      };
    }
    return null;
  }

  if (host === "tiktok.com") {
    const i = parts.indexOf("video");
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (id && /^\d{8,25}$/.test(id)) {
      return { platform: "tiktok", videoId: id, vertical: true, url: `https://www.tiktok.com/${parts.slice(0, i + 2).join("/")}` };
    }
    return null;
  }

  if (host === "facebook.com" || host === "fb.com") {
    let id: string | undefined;
    let vertical = false;
    if (parts[0] === "reel" && /^\d+$/.test(parts[1] ?? "")) {
      id = parts[1];
      vertical = true;
    } else if (parts[0] === "watch" && /^\d+$/.test(u.searchParams.get("v") ?? "")) {
      id = u.searchParams.get("v")!;
    } else {
      const i = parts.indexOf("videos");
      if (i >= 0 && /^\d+$/.test(parts[i + 1] ?? "")) id = parts[i + 1];
    }
    if (!id) return null;
    const url = vertical ? `https://www.facebook.com/reel/${id}` : `https://www.facebook.com/watch/?v=${id}`;
    return { platform: "facebook", videoId: id, vertical, url };
  }
  return null;
}

/** Link rút gọn mà app chia sẻ hay đưa ra — cần mở ra link đầy đủ mới đọc được mã video. */
export function isShortLink(raw: string): boolean {
  return /^(https?:\/\/)?(vt\.tiktok\.com|vm\.tiktok\.com|www\.tiktok\.com\/t\/|tiktok\.com\/t\/|fb\.watch|(www\.)?facebook\.com\/share\/)/i.test(
    raw.trim()
  );
}

export async function resolveShortLink(raw: string): Promise<string | null> {
  try {
    const res = await fetch(raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: { "user-agent": "Mozilla/5.0" },
    });
    return res.url || null;
  } catch {
    return null;
  }
}

/** Link nhúng để phát ngay trên web của trung tâm. */
export function clipEmbedUrl(c: Pick<ClipRow, "platform" | "video_id" | "url">): string {
  switch (c.platform) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${c.video_id}?autoplay=1&rel=0&playsinline=1`;
    case "tiktok":
      return `https://www.tiktok.com/player/v1/${c.video_id}?autoplay=1&rel=0`;
    case "facebook":
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(c.url)}&show_text=false&autoplay=true`;
  }
}

/** Ảnh bìa — chỉ YouTube cho lấy thẳng; TikTok/Facebook dùng khung màu có nút phát. */
export function clipThumbnail(c: Pick<ClipRow, "platform" | "video_id">): string | null {
  return c.platform === "youtube" ? `https://i.ytimg.com/vi/${c.video_id}/hqdefault.jpg` : null;
}

export const PLATFORM_LABELS: Record<ClipPlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  facebook: "Facebook",
};
