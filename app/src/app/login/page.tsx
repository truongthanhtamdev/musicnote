import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { roleHomePath } from "@/lib/types";
import { Logo } from "@/components/logo";
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo className="h-14 w-14 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-slate-900">Piano Guitar Đệm Hát</h1>
          <p className="text-slate-500 mt-1">Hệ thống điểm danh &amp; chấm công giáo viên</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <LoginForm next={next || ""} />
        </div>
      </div>
    </div>
  );
}
