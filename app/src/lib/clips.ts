import { db } from "./db";
import { getSetting } from "./queries";
import type { ClipRow } from "./clip-url";

export * from "./clip-url";

/** Số clip mới nhất hiện ở trang chủ. */
export const HOME_CLIP_LIMIT = 12;

export function listClips(opts?: { publicOnly?: boolean; limit?: number }): ClipRow[] {
  return db
    .prepare(
      `SELECT * FROM clips ${opts?.publicOnly ? "WHERE is_public = 1" : ""}
       ORDER BY id DESC ${opts?.limit ? `LIMIT ${Number(opts.limit)}` : ""}`
    )
    .all() as ClipRow[];
}

export const CHANNEL_KEYS = { youtube: "channel_youtube", tiktok: "channel_tiktok" } as const;

export interface CenterChannels {
  youtube: string | null;
  tiktok: string | null;
}

export function getCenterChannels(): CenterChannels {
  return {
    youtube: getSetting(CHANNEL_KEYS.youtube) || null,
    tiktok: getSetting(CHANNEL_KEYS.tiktok) || null,
  };
}
