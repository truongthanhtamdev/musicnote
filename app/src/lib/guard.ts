import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./auth";
import { roleHomePath, type Role } from "./types";

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
