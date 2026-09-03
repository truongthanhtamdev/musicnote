"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/guard";
import { runBackup } from "@/lib/backup";

/** Takes today's snapshot right now, instead of waiting for the nightly cron. */
export async function runBackupAction() {
  await assertRole(["admin"]);
  runBackup();
  revalidatePath("/admin/backup");
}
