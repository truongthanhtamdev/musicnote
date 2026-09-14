"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getRatingInvite } from "@/lib/queries";
import type { FormState } from "./teachers";

/**
 * Khách chấm sao cho một buổi học, qua link gửi kèm sau buổi đó.
 *
 * Không đòi đăng nhập: phần lớn khách chưa có tài khoản, bắt đăng nhập là
 * không ai chấm. Mã trong link đủ dài để người ngoài không mò ra buổi khác,
 * và mỗi buổi chỉ nhận một lần chấm — chấm lại thì ghi đè điểm cũ, để khách
 * bấm nhầm sao vẫn sửa được.
 */
export async function submitRatingAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const token = String(formData.get("token") || "");
  const stars = Number(formData.get("stars") || 0);
  const comment = String(formData.get("comment") || "").trim();

  if (!token) return { error: "Link đánh giá không hợp lệ" };
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { error: "Bạn chọn số sao giúp mình nhé" };
  }

  const invite = getRatingInvite(token);
  if (!invite) return { error: "Link đánh giá không còn dùng được" };

  db.prepare(
    `INSERT INTO session_ratings (class_id, teacher_id, session_date, stars, comment)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(class_id, session_date) DO UPDATE
       SET stars = excluded.stars, comment = excluded.comment, teacher_id = excluded.teacher_id`
  ).run(invite.classId, invite.teacherId, invite.sessionDate, stars, comment || null);

  revalidatePath("/admin/ratings");
  revalidatePath("/admin/payroll");
  revalidatePath("/teacher/earnings");
  return { success: true };
}
