"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminGuardError, assertRole } from "@/lib/guard";
import { MANAGE_ROLES, ROLE_LABELS, type Role } from "@/lib/types";
import { logAudit } from "@/lib/audit";
import { getUserByEmail, getUserById } from "@/lib/auth";

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
  await assertRole(MANAGE_ROLES);

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
  await assertRole(MANAGE_ROLES);

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
  await assertRole(MANAGE_ROLES);
  db.prepare("UPDATE users SET active = ? WHERE id = ? AND role = 'teacher'").run(
    active ? 1 : 0,
    teacherId
  );
  revalidatePath("/admin/teachers");
}

/**
 * Xoá hẳn một giáo viên khỏi hệ thống.
 *
 * Chặn khi người đó đã có buổi điểm danh: xoá là mất luôn lịch sử dạy và cơ
 * sở tính lương của những tháng trước. Trường hợp đó dùng "Ngừng hoạt động" —
 * giáo viên không nhận lớp mới nữa nhưng sổ sách cũ còn nguyên.
 *
 * Xoá được thì các lớp người đó đang dạy quay về "Chưa xếp giáo viên" chứ
 * không mất lớp.
 */
export async function deleteTeacherAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(MANAGE_ROLES);

  const teacherId = Number(formData.get("teacher_id"));
  const teacher = db
    .prepare("SELECT name FROM users WHERE id = ? AND role = 'teacher'")
    .get(teacherId) as { name: string } | undefined;
  if (!teacher) return { error: "Không tìm thấy giáo viên này" };

  const { c: attended } = db
    .prepare("SELECT COUNT(*) as c FROM attendance WHERE teacher_id = ?")
    .get(teacherId) as { c: number };
  if (attended > 0) {
    return {
      error: `${teacher.name} đã có ${attended} buổi điểm danh — xoá là mất lịch sử dạy và bảng lương cũ. Hãy chuyển sang "Ngừng hoạt động" thay vì xoá.`,
    };
  }

  db.prepare("DELETE FROM users WHERE id = ? AND role = 'teacher'").run(teacherId);
  logAudit(session, "tai_khoan", `Xoá giáo viên ${teacher.name}`);

  revalidatePath("/admin/teachers");
  revalidatePath("/admin/assign");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/payroll");
  return { success: true };
}

/** Vai trò nhân sự tạo/đổi được từ trang Nhân sự quản lý. */
const STAFF_ROLES: Role[] = ["admin", "manager", "coordinator"];

function readStaffRole(formData: FormData): Role | null {
  const raw = String(formData.get("role") || "coordinator");
  return (STAFF_ROLES as string[]).includes(raw) ? (raw as Role) : null;
}

/**
 * Tạo tài khoản nhân sự: giáo vụ hoặc quản lý.
 *
 * Quản lý tạo được tài khoản cho người khác, nhưng không tạo được tài khoản
 * chủ trung tâm — nếu không thì phân quyền vô nghĩa, chỉ cần tự tạo cho mình
 * một tài khoản chủ trung tâm là xem được doanh thu.
 */
export async function createStaffAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(MANAGE_ROLES);

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = readStaffRole(formData);

  if (!name || !email || !password) {
    return { error: "Vui lòng nhập đầy đủ tên, email, mật khẩu" };
  }
  if (password.length < 6) {
    return { error: "Mật khẩu cần tối thiểu 6 ký tự" };
  }
  if (!role) return { error: "Vai trò không hợp lệ" };
  const deniedNew = adminGuardError(session, role);
  if (deniedNew) return { error: deniedNew };
  if (getUserByEmail(email)) {
    return { error: "Email đã tồn tại trong hệ thống" };
  }

  db.prepare(
    `INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, ?, 1)`
  ).run(name, email, bcrypt.hashSync(password, 10), role);

  logAudit(session, "tai_khoan", `Tạo tài khoản ${ROLE_LABELS[role]}: ${name} (${email})`);
  revalidatePath("/admin/staff");
  return { success: true };
}

/**
 * Đổi vai trò của một nhân sự — dùng để nâng giáo vụ lên quản lý.
 *
 * Hai chiều đều bị chặn với chủ trung tâm: không hạ được chủ trung tâm xuống,
 * và không nâng ai lên chủ trung tâm, trừ khi chính chủ trung tâm bấm.
 */
export async function changeStaffRoleAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(MANAGE_ROLES);

  const userId = Number(formData.get("user_id"));
  const role = readStaffRole(formData);
  if (!userId || !role) return { error: "Thiếu thông tin" };

  const target = getUserById(userId);
  if (!target) return { error: "Không tìm thấy tài khoản" };
  if (!(STAFF_ROLES as string[]).includes(target.role)) {
    return { error: "Chỉ đổi được vai trò của nhân sự quản lý" };
  }

  // Chặn cả hai chiều: không hạ được chủ trung tâm, không nâng ai lên chủ.
  const denied = adminGuardError(session, target.role) ?? adminGuardError(session, role);
  if (denied) return { error: denied };

  // Tự hạ quyền chính mình thì ngay lần tải trang sau là mất đường vào, mà
  // không ai khác sửa lại giúp được nếu đó là tài khoản chủ trung tâm cuối.
  if (userId === session.userId) {
    return { error: "Không tự đổi vai trò của chính mình được" };
  }
  if (target.role === "admin" && countAdmins() <= 1) {
    return { error: "Phải còn ít nhất một tài khoản chủ trung tâm" };
  }

  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  logAudit(
    session,
    "tai_khoan",
    `Đổi vai trò ${target.name}: ${ROLE_LABELS[target.role]} → ${ROLE_LABELS[role]}`
  );
  revalidatePath("/admin/staff");
  return { success: true };
}

function countAdmins(): number {
  return (db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1").get() as {
    c: number;
  }).c;
}
