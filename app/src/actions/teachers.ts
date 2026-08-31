"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { getUserByEmail } from "@/lib/auth";

export interface FormState {
  error?: string;
  success?: boolean;
}

function formatSubjects(formData: FormData): string {
  const checked = formData.getAll("subjects").map(String);
  const other = String(formData.get("subjects_other") || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return Array.from(new Set([...checked, ...other])).join(",");
}

export async function createTeacherAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertRole(["admin"]);

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  const payPerSession = Number(formData.get("pay_per_session") || 0);
  const languages = formData.getAll("languages").join(",") || "vi";
  const subjects = formatSubjects(formData);

  if (!name || !email || !password) {
    return { error: "Vui lòng nhập đầy đủ tên, email, mật khẩu" };
  }
  if (password.length < 6) {
    return { error: "Mật khẩu cần tối thiểu 6 ký tự" };
  }
  if (getUserByEmail(email)) {
    return { error: "Email đã tồn tại trong hệ thống" };
  }

  db.prepare(
    `INSERT INTO users (name, email, password_hash, role, phone, pay_per_session, languages, subjects, active)
     VALUES (?, ?, ?, 'teacher', ?, ?, ?, ?, 1)`
  ).run(
    name,
    email,
    bcrypt.hashSync(password, 10),
    phone || null,
    payPerSession || null,
    languages,
    subjects
  );

  revalidatePath("/admin/teachers");
  return { success: true };
}

export async function updateTeacherAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertRole(["admin"]);

  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const payPerSession = Number(formData.get("pay_per_session") || 0);
  const languages = formData.getAll("languages").join(",") || "vi";
  const subjects = formatSubjects(formData);

  if (!id || !name) return { error: "Thiếu thông tin" };

  db.prepare(
    `UPDATE users SET name = ?, phone = ?, pay_per_session = ?, languages = ?, subjects = ? WHERE id = ? AND role = 'teacher'`
  ).run(name, phone || null, payPerSession || null, languages, subjects, id);

  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${id}`);
  return { success: true };
}

export async function toggleTeacherActiveAction(teacherId: number, active: boolean) {
  await assertRole(["admin"]);
  db.prepare("UPDATE users SET active = ? WHERE id = ? AND role = 'teacher'").run(
    active ? 1 : 0,
    teacherId
  );
  revalidatePath("/admin/teachers");
}

export async function createCoordinatorAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertRole(["admin"]);

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email || !password) {
    return { error: "Vui lòng nhập đầy đủ tên, email, mật khẩu" };
  }
  if (password.length < 6) {
    return { error: "Mật khẩu cần tối thiểu 6 ký tự" };
  }
  if (getUserByEmail(email)) {
    return { error: "Email đã tồn tại trong hệ thống" };
  }

  db.prepare(
    `INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, 'coordinator', 1)`
  ).run(name, email, bcrypt.hashSync(password, 10));

  revalidatePath("/admin/staff");
  return { success: true };
}
