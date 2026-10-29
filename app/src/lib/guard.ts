import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./auth";
import { db } from "./db";
import { MANAGE_ROLES, roleHomePath, type Role } from "./types";

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    redirect(roleHomePath(session.role));
  }
  return session;
}

export class ForbiddenError extends Error {
  constructor(message = "Bạn không có quyền thực hiện thao tác này") {
    super(message);
  }
}

export async function assertRole(roles: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ForbiddenError("Chưa đăng nhập");
  if (!roles.includes(session.role)) throw new ForbiddenError();
  return session;
}

/**
 * Được xem và sửa lớp học: Quản lý trở lên, hoặc nhân viên đặt hẹn đã được
 * cấp quyền "Được sửa lớp học" ở trang Nhân sự. Đọc thẳng từ cơ sở dữ liệu
 * nên bật / tắt quyền là có hiệu lực ngay lần bấm sau, không phải đăng nhập lại.
 */
export function isClassEditor(session: Pick<SessionPayload, "userId" | "role">): boolean {
  if (MANAGE_ROLES.includes(session.role)) return true;
  if (session.role !== "coordinator") return false;
  const row = db.prepare("SELECT can_edit_classes FROM users WHERE id = ?").get(session.userId) as
    | { can_edit_classes: number }
    | undefined;
  return row?.can_edit_classes === 1;
}

export async function requireClassEditor(): Promise<SessionPayload> {
  const session = await requireSession();
  if (!isClassEditor(session)) redirect(roleHomePath(session.role));
  return session;
}

export async function assertClassEditor(): Promise<SessionPayload> {
  const session = await assertSession();
  if (!isClassEditor(session)) throw new ForbiddenError();
  return session;
}

/** Như assertClassEditor, nhưng giáo viên cũng qua — action tự kiểm lớp có phải của họ không. */
export async function assertClassEditorOrTeacher(): Promise<SessionPayload> {
  const session = await assertSession();
  if (session.role !== "teacher" && !isClassEditor(session)) throw new ForbiddenError();
  return session;
}

export async function assertSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ForbiddenError("Chưa đăng nhập");
  return session;
}

/**
 * Lý do không được đụng tới tài khoản có vai trò này, hoặc null nếu được.
 *
 * Chặn leo thang quyền: Quản lý không được thao tác với tài khoản chủ trung
 * tâm, cũng không được phong ai đó lên chủ trung tâm. Thiếu chốt này thì phân
 * quyền chỉ là trang trí — một Quản lý chỉ cần tự đổi vai trò mình thành chủ
 * trung tâm, hoặc đặt lại mật khẩu của chủ trung tâm rồi đăng nhập bằng tài
 * khoản đó, là xem được toàn bộ doanh thu.
 *
 * Trả về chuỗi thay vì ném lỗi, để form hiện được câu giải thích tử tế thay
 * vì vỡ cả trang.
 */
export function adminGuardError(actor: SessionPayload, targetRole: Role | undefined): string | null {
  if (targetRole === "admin" && actor.role !== "admin") {
    return "Chỉ chủ trung tâm mới thao tác được với tài khoản chủ trung tâm";
  }
  return null;
}
