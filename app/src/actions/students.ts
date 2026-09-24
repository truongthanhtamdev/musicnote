"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { MANAGE_ROLES } from "@/lib/types";
import { getUserByEmail } from "@/lib/auth";
import { listAccountCandidates } from "@/lib/queries";
import { logAudit } from "@/lib/audit";
import { createStudentAccount } from "@/lib/student-accounts";
import type { FormState } from "./teachers";

export async function createStudentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertRole(MANAGE_ROLES);

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
  await assertRole(MANAGE_ROLES);
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

export interface LinkedAccount {
  customerName: string;
  login: string;
  accountName: string;
  classCount: number;
}

export interface BulkAccountState extends FormState {
  created?: CreatedAccount[];
  /** Khách đã có tài khoản sẵn, chỉ gắn thêm lớp — không có mật khẩu mới. */
  linked?: LinkedAccount[];
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
  const session = await assertRole(MANAGE_ROLES);

  const chosen = new Set(formData.getAll("keys").map(String));
  if (chosen.size === 0) return { error: "Bạn chọn ít nhất một khách hàng nhé" };

  const candidates = listAccountCandidates().filter(
    (c) => chosen.has(c.key) && (c.status === "ok" || c.status === "link_existing")
  );
  if (candidates.length === 0) {
    return { error: "Những khách đã chọn đều chưa tạo được (thiếu số điện thoại trong hồ sơ lớp)" };
  }

  const linkClass = db.prepare("UPDATE classes SET student_user_id = ? WHERE id = ?");

  const created: CreatedAccount[] = [];
  const linked: LinkedAccount[] = [];
  const run = db.transaction(() => {
    for (const c of candidates) {
      if (c.status === "link_existing" && c.existingAccount) {
        for (const classId of c.classIds) linkClass.run(c.existingAccount.id, classId);
        linked.push({
          customerName: c.customerName,
          login: c.login!,
          accountName: c.existingAccount.name,
          classCount: c.classIds.length,
        });
        continue;
      }
      const account = createStudentAccount({
        name: c.customerName,
        login: c.login!,
        classIds: c.classIds,
      });
      created.push({
        customerName: c.customerName,
        login: account.login,
        password: account.password,
        classCount: account.classCount,
      });
    }
  });

  try {
    run();
  } catch (e) {
    // Hay gặp nhất: người khác vừa tạo tài khoản cùng số điện thoại trong lúc
    // trang này đang mở. Cả lượt bị huỷ chứ không tạo nửa vời, nên chỉ cần
    // bảo giáo vụ tải lại trang.
    console.error("[tai-khoan-hang-loat]", e);
    return {
      error: "Không tạo được — có thể ai đó vừa tạo tài khoản cùng số điện thoại. Bạn tải lại trang rồi thử lại nhé.",
    };
  }

  logAudit(
    session,
    "tai_khoan",
    [
      created.length
        ? `Tạo hàng loạt ${created.length} tài khoản học viên: ${created
            .map((a) => a.customerName)
            .join(", ")}`
        : "",
      linked.length
        ? `Gắn lớp vào ${linked.length} tài khoản có sẵn: ${linked
            .map((a) => a.customerName)
            .join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ")
  );
  revalidatePath("/admin/students");
  revalidatePath("/admin/classes");
  return { success: true, created, linked };
}
