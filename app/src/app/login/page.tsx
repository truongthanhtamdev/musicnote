import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { roleHomePath } from "@/lib/types";
import { IconUsers } from "@/components/icons";
import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect(roleHomePath(session.role));
  }
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-200">
            <IconUsers className="size-6" />
          </span>
          <h1 className="text-[22px] font-bold text-white">ClientHub</h1>
          <p className="mt-1 text-[13px] text-brand-300">
            Piano Guitar Đệm Hát · Quản lý khách hàng &amp; lớp học
          </p>
        </div>
        <div className="card p-6 shadow-lg shadow-black/10">
          <LoginForm next={next || ""} />
        </div>
        <p className="mt-5 text-center text-[11.5px] text-brand-300/70">
          Dữ liệu khách hàng của trung tâm — không chia sẻ tài khoản cho người ngoài.
        </p>
      </div>
    </div>
  );
}
