import { requireSession } from "@/lib/guard";
import { TopNav } from "@/components/nav";
import { roleHomePath } from "@/lib/types";
import ChangePasswordForm from "./change-password-form";

export default async function ChangePasswordPage() {
  const session = await requireSession();

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav
        title="Piano Guitar Đệm Hát"
        userName={session.name}
        links={[{ href: roleHomePath(session.role), label: "Về trang chính" }]}
      />
      <main className="max-w-sm mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Đổi mật khẩu</h1>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <ChangePasswordForm />
        </div>
      </main>
    </div>
  );
}
