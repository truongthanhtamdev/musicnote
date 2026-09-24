"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminGuardError, assertRole, assertSession } from "@/lib/guard";
import { MANAGE_ROLES } from "@/lib/types";
import { getUserById } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { normalizeFacebookUrl } from "@/lib/format";

export interface FormState {
  error?: string;
  success?: boolean;
}

export async function changeOwnPasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertSession();

  const currentPassword = String(formData.get("current_password") || "");
  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  const user = getUserById(session.userId);
  if (!user) return { error: "Không tìm thấy tài khoản" };

  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return { error: "Mật khẩu hiện tại không đúng" };
  }
  if (newPassword.length < 6) {
    return { error: "Mật khẩu mới cần tối thiểu 6 ký tự" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Xác nhận mật khẩu mới không khớp" };
  }

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    bcrypt.hashSync(newPassword, 10),
    user.id
  );

  return { success: true };
}

export async function adminResetPasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(MANAGE_ROLES);

  const userId = Number(formData.get("user_id"));
  const newPassword = String(formData.get("new_password") || "");

  if (!userId) return { error: "Thiếu thông tin tài khoản" };
  if (newPassword.length < 6) {
    return { error: "Mật khẩu mới cần tối thiểu 6 ký tự" };
  }

  // Phải kiểm TRƯỚC khi ghi: đặt lại mật khẩu của chủ trung tâm là chiếm được
  // tài khoản đó, nên đây chính là đường leo thang quyền ngắn nhất.
  const target = getUserById(userId);
  if (!target) return { error: "Không tìm thấy tài khoản" };
  const denied = adminGuardError(session, target.role);
  if (denied) return { error: denied };

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    bcrypt.hashSync(newPassword, 10),
    userId
  );

  logAudit(session, "tai_khoan", `Đặt lại mật khẩu cho ${target.name}`);
  return { success: true };
}

/**
 * Khách tự cập nhật thông tin liên hệ của mình.
 *
 * Dữ liệu lớp nhập từ Excel nên thiếu nhiều ô (SĐT, Facebook, tên người đóng
 * học phí). Giáo vụ đi hỏi từng người thì không xuể, mà khách tự điền một lần
 * là xong — nên những ô nào trong lớp còn TRỐNG thì điền theo hồ sơ này. Ô
 * nào trung tâm đã ghi thì giữ nguyên, không để khách ghi đè lên sổ sách.
 */
export async function saveMyProfileAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(["student"]);

  const name = String(formData.get("name") || "").trim().slice(0, 100);
  const phone = String(formData.get("phone") || "").trim().slice(0, 30);
  const facebook = normalizeFacebookUrl(String(formData.get("facebook_url") || ""));
  const address = String(formData.get("address") || "").trim().slice(0, 200);
  const note = String(formData.get("note") || "").trim().slice(0, 500);

  if (!name) return { error: "Bạn nhập giúp mình họ tên nhé" };

  db.prepare(
    "UPDATE users SET name = ?, phone = ?, facebook_url = ?, address = ?, note = ? WHERE id = ?"
  ).run(name, phone || null, facebook, address || null, note || null, session.userId);

  db.prepare(
    `UPDATE classes
        SET student_phone = COALESCE(NULLIF(student_phone, ''), ?),
            guardian_name = COALESCE(NULLIF(guardian_name, ''), ?),
            facebook_url  = COALESCE(NULLIF(facebook_url, ''), ?)
      WHERE student_user_id = ?`
  ).run(phone || null, name, facebook, session.userId);

  revalidatePath("/student");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/lookup");
  return { success: true };
}
