"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/guard";

export async function markNotificationReadAction(id: number) {
  const session = await assertSession();
  db.prepare(
    "UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ?"
  ).run(id, session.userId);
  revalidatePath("/teacher");
  revalidatePath("/teacher/schedule");
}
