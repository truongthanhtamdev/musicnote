import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { roleHomePath, SUBJECT_SUGGESTIONS } from "@/lib/types";
import { Logo } from "@/components/logo";
import { IconCalendarCheck, IconPackage, IconVideo, SubjectIcon } from "@/components/icons";
import LoginForm from "./login-form";

/**
 * Trang này khách hàng cũng đăng nhập chứ không riêng nhân sự trung tâm, nên
 * phần giới thiệu nói bằng góc nhìn người học (lịch học, tiến độ gói, vào
 * lớp), không nhắc chuyện chấm công hay lương giáo viên.
 */
const HIGHLIGHTS = [
  {
    icon: <IconCalendarCheck className="w-5 h-5" />,
    title: "Lịch học rõ từng buổi",
    text: "Xem buổi học sắp tới, xác nhận tham gia hoặc xin dời giờ ngay trên web.",
  },
  {
    icon: <IconPackage className="w-5 h-5" />,
    title: "Theo dõi gói học",
    text: "Biết còn bao nhiêu tiết trong gói 20/50/100 và nội dung đã học từng buổi.",
  },
  {
    icon: <IconVideo className="w-5 h-5" />,
    title: "Vào lớp một chạm",
    text: "Bấm là vào phòng học online, học xong chấm sao cho buổi học.",
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
            Lịch học, tiến độ và bài học của bạn ở cùng một nơi
          </h2>
          <p className="text-navy-200 mt-3">
            Dành cho học viên, phụ huynh và thầy cô của trung tâm — cập nhật theo thời gian thực
            sau mỗi buổi học.
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

          <p className="text-xs font-semibold uppercase tracking-wide text-navy-300 mt-8">
            Các môn trung tâm đang dạy
          </p>
          <ul className="flex flex-wrap gap-2 mt-2.5">
            {SUBJECT_SUGGESTIONS.map((s) => (
              <li
                key={s}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm"
              >
                <SubjectIcon subject={s} className="w-4 h-4 text-wood-300" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-navy-300">
          © {new Date().getFullYear()} Piano Guitar Đệm Hát · Nhạc cụ · Toán · Tiếng Việt · Tiếng
          Anh
        </p>
      </div>

      {/* Cột form */}
      <div className="flex items-center justify-center px-4 py-10 bg-ivory-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-7">
            <Logo className="h-14 mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-ink-900">Piano Guitar Đệm Hát</h1>
            <p className="text-ink-500 text-sm mt-1">Lịch học · Tiến độ gói · Bài đã học</p>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(16,36,62,0.06)] border border-navy-100 p-6">
            <h2 className="text-2xl font-bold text-ink-900 tracking-tight">Đăng nhập</h2>
            <p className="text-sm text-ink-500 mt-1 mb-5">
              Dùng email hoặc số điện thoại đã đăng ký với trung tâm.
            </p>
            <LoginForm next={next || ""} />
            <p className="text-center mt-4">
              <Link
                href="/quen-mat-khau"
                className="text-sm font-semibold text-wood-600 hover:text-wood-700"
              >
                Quên mật khẩu?
              </Link>
            </p>
          </div>

          <p className="text-center text-sm text-ink-500 mt-5">
            Chưa có tài khoản?{" "}
            <Link href="/#hoc-thu" className="font-semibold text-wood-600 hover:text-wood-700">
              Đăng ký học thử miễn phí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
