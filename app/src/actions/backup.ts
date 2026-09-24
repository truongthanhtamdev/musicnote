"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/guard";
import { MANAGE_ROLES } from "@/lib/types";
import { runBackup } from "@/lib/backup";

/** Takes today's snapshot right now, instead of waiting for the nightly cron. */
export async function runBackupAction() {
  await assertRole(MANAGE_ROLES);
  runBackup();
  revalidatePath("/admin/backup");
}
