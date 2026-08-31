"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { assertRole, assertSession } from "@/lib/guard";
import { getUserById } from "@/lib/auth";

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
  await assertRole(["admin"]);

  const userId = Number(formData.get("user_id"));
  const newPassword = String(formData.get("new_password") || "");

  if (!userId) return { error: "Thiếu thông tin tài khoản" };
  if (newPassword.length < 6) {
    return { error: "Mật khẩu mới cần tối thiểu 6 ký tự" };
  }

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    bcrypt.hashSync(newPassword, 10),
    userId
  );

  return { success: true };
}
