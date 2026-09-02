import Link from "next/link";
import { requireSession } from "@/lib/guard";
import { roleHomePath } from "@/lib/types";
import { Logo } from "@/components/logo";
import { IconChevronLeft, IconKey } from "@/components/icons";
import { Card, CardHeader } from "@/components/ui";
import ChangePasswordForm from "./change-password-form";

export default async function ChangePasswordPage() {
  const session = await requireSession();

  return (
    <div className="min-h-screen bg-ivory-50">
      <header className="bg-navy-950 text-white">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <span className="flex items-center gap-2.5 min-w-0">
            <Logo className="h-8 shrink-0" />
            <span className="font-bold text-[15px] leading-tight">Piano Guitar Đệm Hát</span>
          </span>
          <Link
            href={roleHomePath(session.role)}
            className="inline-flex items-center gap-1 text-sm font-medium text-navy-200 hover:text-white transition"
          >
            <IconChevronLeft className="w-4 h-4" />
            Về trang chính
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <Card padded={false}>
          <CardHeader title="Đổi mật khẩu" icon={<IconKey className="w-4.5 h-4.5 text-wood-500" />} />
          <div className="p-5">
            <p className="text-sm text-ink-500 mb-4">
              Đang đăng nhập bằng tài khoản{" "}
              <span className="font-medium text-ink-900">{session.name}</span>. Mật khẩu mới cần ít
              nhất 6 ký tự.
            </p>
            <ChangePasswordForm />
          </div>
        </Card>
      </main>
    </div>
  );
}
