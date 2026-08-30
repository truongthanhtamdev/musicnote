"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { getUserByEmail } from "@/lib/auth";
import type { FormState } from "./teachers";

export async function createStudentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertRole(["admin"]);

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");

  if (!name || !email || !password) {
    return { error: "Vui lòng nhập đầy đủ tên, email/SĐT đăng nhập, mật khẩu" };
  }
  if (password.length < 6) {
    return { error: "Mật khẩu cần tối thiểu 6 ký tự" };
  }
  if (getUserByEmail(email)) {
    return { error: "Email/SĐT đăng nhập đã tồn tại trong hệ thống" };
  }

  db.prepare(
    `INSERT INTO users (name, email, password_hash, role, phone, active) VALUES (?, ?, ?, 'student', ?, 1)`
  ).run(name, email, bcrypt.hashSync(password, 10), phone || null);

  revalidatePath("/admin/students");
  return { success: true };
}

export async function toggleStudentActiveAction(studentId: number, active: boolean) {
  await assertRole(["admin"]);
  db.prepare("UPDATE users SET active = ? WHERE id = ? AND role = 'student'").run(
    active ? 1 : 0,
    studentId
  );
  revalidatePath("/admin/students");
}
