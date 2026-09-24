"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/guard";
import { MANAGE_ROLES } from "@/lib/types";
import { db } from "@/lib/db";
import { deleteBonus } from "@/lib/bonus";
import { logAudit } from "@/lib/audit";
import { formatVND } from "@/lib/format";

/** Gỡ một khoản thưởng ghi nhầm. Ghi nhật ký vì đây là đụng tới tiền. */
export async function deleteBonusAction(id: number) {
  const session = await assertRole(MANAGE_ROLES);
  const row = db
    .prepare(
      `SELECT b.amount, b.note, u.name as staff_name
       FROM staff_bonuses b JOIN users u ON u.id = b.staff_id WHERE b.id = ?`
    )
    .get(id) as { amount: number; note: string | null; staff_name: string } | undefined;
  if (!row) return;

  deleteBonus(id);
  logAudit(
    session,
    "luong",
    `Gỡ thưởng ${formatVND(row.amount)} của ${row.staff_name}${row.note ? ` — ${row.note}` : ""}`
  );
  revalidatePath("/admin/thuong");
}
