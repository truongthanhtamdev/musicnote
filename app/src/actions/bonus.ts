"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/guard";
import { MANAGE_ROLES } from "@/lib/types";
import { db } from "@/lib/db";
import { awardTrialBonus, deleteBonus, listUnrewardedTrials } from "@/lib/bonus";
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

/**
 * Ghi bổ sung thưởng cho các buổi học thử bị sót trong kỳ.
 *
 * An toàn bấm nhiều lần: mỗi khoản neo vào đúng một dòng điểm danh và trùng
 * thì cơ sở dữ liệu tự bỏ qua. Buổi mà lớp chưa gán giáo vụ thì vẫn không ghi
 * được — phải gán giáo vụ ở trang lớp trước rồi quét lại.
 */
export async function rescanTrialBonusesAction(from: string, to: string) {
  const session = await assertRole(MANAGE_ROLES);

  const missing = listUnrewardedTrials(from, to);
  let awarded = 0;
  for (const m of missing) {
    if (!m.coordinator_id) continue;
    awardTrialBonus(m.attendance_id);
    awarded++;
  }

  if (awarded > 0) {
    logAudit(session, "luong", `Quét bổ sung thưởng học thử: ghi thêm ${awarded} khoản (${from} → ${to})`);
  }
  revalidatePath("/admin/thuong");
}
