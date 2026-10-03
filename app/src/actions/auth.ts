"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { clearSessionCookie, findLoginCandidates, setSessionCookie } from "@/lib/auth";
import { clearLoginFailures, loginLockedMinutes, recordLoginFailure } from "@/lib/login-throttle";
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
    return { error: "Vui lòng nhập tên đăng nhập và mật khẩu" };
  }

  const locked = await loginLockedMinutes(email);
  if (locked > 0) {
    return {
      error: `Nhập sai quá nhiều lần — thử lại sau ${locked} phút, hoặc nhắn trung tâm để được đặt lại mật khẩu.`,
    };
  }

  const user = findLoginCandidates(email).find(
    (u) => u.active && bcrypt.compareSync(password, u.password_hash)
  );
  if (!user) {
    await recordLoginFailure(email);
    return { error: "Tên đăng nhập hoặc mật khẩu không đúng" };
  }

  clearLoginFailures(email);
  await setSessionCookie(user);

  // "//trang-khac.com" cũng bắt đầu bằng "/" nhưng là sang tên miền khác.
  if (next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) {
    redirect(next);
  }
  redirect(roleHomePath(user.role));
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
