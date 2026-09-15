"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { getUserByEmail } from "@/lib/auth";
import { listAccountCandidates } from "@/lib/queries";
import { logAudit } from "@/lib/audit";
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

export interface CreatedAccount {
  customerName: string;
  login: string;
  password: string;
  classCount: number;
}

export interface BulkAccountState extends FormState {
  created?: CreatedAccount[];
  skipped?: number;
}

/**
 * Mật khẩu tạm dễ đọc qua điện thoại: bỏ các ký tự nhìn giống nhau (0/O,
 * 1/l/I) để giáo vụ đọc cho khách không bị nhầm.
 */
function tempPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Tạo tài khoản đăng nhập hàng loạt cho khách đang học và gắn luôn lớp của họ
 * vào tài khoản đó.
 *
 * Tên đăng nhập là số điện thoại của khách — khách nhớ được mà không cần ghi
 * lại, và trùng với số giáo vụ vẫn dùng để nhắn Zalo. Mật khẩu sinh ngẫu
 * nhiên, chỉ hiện đúng một lần ngay sau khi tạo (trong máy chỉ lưu bản mã
 * hoá), nên màn hình kết quả có nút tải file để giáo vụ gửi cho khách.
 */
export async function createStudentAccountsAction(
  _prev: BulkAccountState,
  formData: FormData
): Promise<BulkAccountState> {
  const session = await assertRole(["admin"]);

  const chosen = new Set(formData.getAll("keys").map(String));
  if (chosen.size === 0) return { error: "Bạn chọn ít nhất một khách hàng nhé" };

  const candidates = listAccountCandidates().filter(
    (c) => c.status === "ok" && chosen.has(c.key)
  );
  if (candidates.length === 0) {
    return { error: "Những khách đã chọn đều chưa tạo được (thiếu SĐT hoặc SĐT đã có tài khoản)" };
  }

  const insertUser = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, phone, active)
     VALUES (?, ?, ?, 'student', ?, 1)`
  );
  const linkClass = db.prepare("UPDATE classes SET student_user_id = ? WHERE id = ?");

  const created: CreatedAccount[] = [];
  const run = db.transaction(() => {
    for (const c of candidates) {
      const password = tempPassword();
      const info = insertUser.run(
        c.customerName,
        c.login!,
        bcrypt.hashSync(password, 10),
        c.login!
      );
      for (const classId of c.classIds) linkClass.run(info.lastInsertRowid, classId);
      created.push({
        customerName: c.customerName,
        login: c.login!,
        password,
        classCount: c.classIds.length,
      });
    }
  });
  run();

  logAudit(
    session,
    "tai_khoan",
    `Tạo hàng loạt ${created.length} tài khoản học viên: ${created
      .map((a) => a.customerName)
      .join(", ")}`
  );
  revalidatePath("/admin/students");
  revalidatePath("/admin/classes");
  return { success: true, created, skipped: chosen.size - created.length };
}
