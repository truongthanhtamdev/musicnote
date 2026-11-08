import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { readCheckinPhoto } from "@/lib/office-checkin";
import { MANAGE_ROLES } from "@/lib/types";

/** Ảnh chấm công: chỉ Quản lý trở lên hoặc chính người chấm công được xem. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Forbidden", { status: 403 });
  const id = Number((await params).id);
  const row = db.prepare("SELECT user_id, photo FROM office_checkins WHERE id = ?").get(id) as
    | { user_id: number; photo: string | null }
    | undefined;
  if (!row?.photo) return new Response("Not found", { status: 404 });
  if (!MANAGE_ROLES.includes(session.role) && row.user_id !== session.userId) {
    return new Response("Forbidden", { status: 403 });
  }
  const buf = readCheckinPhoto(row.photo);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400" },
  });
}
