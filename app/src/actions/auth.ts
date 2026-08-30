"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { clearSessionCookie, getUserByEmail, setSessionCookie } from "@/lib/auth";
import { roleHomePath } from "@/lib/types";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "");

  if (!email || !password) {
    return { error: "Vui lòng nhập email và mật khẩu" };
  }

  const user = getUserByEmail(email);
  if (!user || !user.active) {
    return { error: "Email hoặc mật khẩu không đúng" };
  }

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    return { error: "Email hoặc mật khẩu không đúng" };
  }

  await setSessionCookie({ userId: user.id, role: user.role, name: user.name });

  if (next && next.startsWith("/")) {
    redirect(next);
  }
  redirect(roleHomePath(user.role));
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
