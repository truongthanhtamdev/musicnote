import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { roleHomePath } from "@/lib/types";
import { Logo } from "@/components/logo";
import { IconCalendarCheck, IconPackage, IconWallet } from "@/components/icons";
import LoginForm from "./login-form";

const HIGHLIGHTS = [
  {
    icon: <IconCalendarCheck className="w-5 h-5" />,
    title: "Điểm danh trong một chạm",
    text: "Giáo viên mở màn hình Hôm nay là thấy ngay lớp cần điểm danh.",
  },
  {
    icon: <IconPackage className="w-5 h-5" />,
    title: "Theo dõi gói học",
    text: "Biết chính xác học viên nào sắp hết 20/50/100 tiết để nhắc gia hạn.",
  },
  {
    icon: <IconWallet className="w-5 h-5" />,
    title: "Chấm công minh bạch",
    text: "Lương tính tự động từ số tiết đã dạy, có cả buổi học thử.",
  },
];

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
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Cột thương hiệu */}
      <div className="hidden lg:flex flex-col justify-between bg-navy-950 text-white px-12 py-10">
        <div className="flex items-center gap-3">
          <Logo className="h-10" />
          <span className="font-bold text-lg">Piano Guitar Đệm Hát</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Vận hành lớp nhạc online gọn gàng trong một hệ thống
          </h2>
          <p className="text-navy-200 mt-3">
            Lịch dạy, điểm danh, gói học và lương giáo viên — tất cả ở cùng một nơi, cập nhật theo
            thời gian thực.
          </p>
          <ul className="mt-8 space-y-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-3.5">
                <span className="shrink-0 rounded-xl bg-white/10 text-wood-300 p-2.5 h-fit">
                  {h.icon}
                </span>
                <div>
                  <p className="font-semibold">{h.title}</p>
                  <p className="text-sm text-navy-200 mt-0.5">{h.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-navy-300">
          © {new Date().getFullYear()} Piano Guitar Đệm Hát · Hệ thống quản lý nội bộ
        </p>
      </div>

      {/* Cột form */}
      <div className="flex items-center justify-center px-4 py-10 bg-ivory-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-7">
            <Logo className="h-14 mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-ink-900">Piano Guitar Đệm Hát</h1>
            <p className="text-ink-500 text-sm mt-1">Hệ thống điểm danh &amp; chấm công</p>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(16,36,62,0.06)] border border-navy-100 p-6">
            <h2 className="text-2xl font-bold text-ink-900 tracking-tight">Đăng nhập</h2>
            <p className="text-sm text-ink-500 mt-1 mb-5">
              Dùng email hoặc số điện thoại đã đăng ký với trung tâm.
            </p>
            <LoginForm next={next || ""} />
          </div>
        </div>
      </div>
    </div>
  );
}
