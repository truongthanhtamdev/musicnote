"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { ADMIN_AREA_ROLES, MANAGE_ROLES, canonicalSubject } from "@/lib/types";
import { setSetting } from "@/lib/queries";
import { CHANNEL_KEYS, isShortLink, parseClipUrl, resolveShortLink } from "@/lib/clips";
import { logAudit } from "@/lib/audit";
import type { FormState } from "./teachers";

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/clip");
}

export async function addClipAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await assertRole(ADMIN_AREA_ROLES);
  const raw = String(formData.get("url") || "").trim().slice(0, 500);
  const title = String(formData.get("title") || "").trim().slice(0, 120);
  const subject = canonicalSubject(String(formData.get("subject") || "").trim().slice(0, 40));
  const isPublic = formData.get("is_public") === "on" ? 1 : 0;
  if (!raw) return { error: "Dán link clip vào trước nhé" };

  let parsed = parseClipUrl(raw);
  if (!parsed && isShortLink(raw)) {
    const full = await resolveShortLink(raw);
    parsed = full ? parseClipUrl(full) : null;
  }
  if (!parsed && isShortLink(raw)) {
    return {
      error:
        "Link rút gọn này chưa mở được. Mở clip trên trình duyệt rồi copy link đầy đủ trên thanh địa chỉ dán vào nhé.",
    };
  }
  if (!parsed) {
    return {
      error:
        "Không đọc được link này. Dán link clip YouTube, TikTok hoặc Facebook (bấm Chia sẻ → Sao chép liên kết).",
    };
  }

  const dup = db
    .prepare("SELECT id FROM clips WHERE platform = ? AND video_id = ?")
    .get(parsed.platform, parsed.videoId);
  if (dup) return { error: "Clip này đã có trong danh sách rồi" };

  const id = db
    .prepare(
      `INSERT INTO clips (url, platform, video_id, vertical, title, subject, is_public, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(parsed.url, parsed.platform, parsed.videoId, parsed.vertical ? 1 : 0, title || null, subject || null, isPublic, session.userId)
    .lastInsertRowid;
  logAudit(session, "he_thong", `Thêm clip #${id} (${parsed.platform}): ${title || parsed.url}`);
  refresh();
  return { success: true };
}

export async function setClipPublicAction(id: number, isPublic: boolean) {
  const session = await assertRole(ADMIN_AREA_ROLES);
  db.prepare("UPDATE clips SET is_public = ? WHERE id = ?").run(isPublic ? 1 : 0, id);
  logAudit(session, "he_thong", `${isPublic ? "Hiện" : "Ẩn"} clip #${id} trên trang chủ`);
  refresh();
}

export async function deleteClipAction(id: number) {
  const session = await assertRole(ADMIN_AREA_ROLES);
  db.prepare("DELETE FROM clips WHERE id = ?").run(id);
  logAudit(session, "he_thong", `Xoá clip #${id}`);
  refresh();
}

/** "@pianoguitardemhat" hay link đầy đủ đều được — đưa về link mở được. */
function channelUrl(raw: string, base: string): string {
  const v = raw.trim().slice(0, 300);
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.includes(".")) return `https://${v}`;
  return `${base}/@${v.replace(/^@/, "")}`;
}

export async function saveChannelsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(MANAGE_ROLES);
  setSetting(CHANNEL_KEYS.youtube, channelUrl(String(formData.get("youtube") || ""), "https://www.youtube.com"));
  setSetting(CHANNEL_KEYS.tiktok, channelUrl(String(formData.get("tiktok") || ""), "https://www.tiktok.com"));
  refresh();
  return { success: true };
}
