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
