import Link from "next/link";
import { getCenterContact } from "@/lib/queries";
import { Logo } from "@/components/logo";
import { ContactButtons } from "@/components/contact-buttons";
import { IconKey } from "@/components/icons";

export const metadata = { title: "Quên mật khẩu · Piano Guitar Đệm Hát" };

// Trang không đọc session nên Next sẽ dựng sẵn lúc build và giữ nguyên số Zalo
// cũ sau khi chủ trung tâm đổi trong Cài đặt — đọc lại mỗi lượt truy cập cho
// chắc, trang này một ngày vài lượt nên không tốn gì.
export const dynamic = "force-dynamic";

/**
 * Trung tâm chưa gắn dịch vụ gửi email, nên không tự đặt lại mật khẩu qua
 * mail được. Thay vì để nút "Quên mật khẩu" dẫn tới trang chết, trang này chỉ
 * cho người dùng đường đi thật: nhắn Zalo/Facebook cho giáo vụ, giáo vụ bấm
 * "Đặt lại mật khẩu" trong trang quản trị rồi đọc lại mật khẩu mới.
 */
export default function ForgotPasswordPage() {
  const { facebook, zalo } = getCenterContact();
  const hasContact = Boolean(facebook || zalo);

  return (
    <div className="min-h-screen bg-ivory-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <Logo className="h-14 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-ink-900">Piano Guitar Đệm Hát</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(16,36,62,0.06)] border border-navy-100 p-6">
          <p className="inline-flex items-center gap-2 text-wood-600">
            <IconKey className="w-5 h-5" />
            <span className="text-sm font-semibold">Lấy lại mật khẩu</span>
          </p>
          <h2 className="text-2xl font-bold text-ink-900 tracking-tight mt-2">
            Quên mật khẩu thì nhắn cho trung tâm nhé
          </h2>
          <p className="text-sm text-ink-600 mt-2 leading-relaxed">
            Nhắn cho giáo vụ tên học viên và email (hoặc số điện thoại) đang dùng để đăng nhập.
            Giáo vụ đặt lại mật khẩu mới và gửi lại cho bạn ngay trong giờ làm việc.
          </p>

          <ol className="mt-4 space-y-2.5 text-sm text-ink-700">
            {[
              "Nhắn Zalo hoặc Facebook cho trung tâm.",
              "Cho biết tên học viên và email/SĐT đăng nhập.",
              "Nhận mật khẩu mới, đăng nhập rồi đổi lại mật khẩu của riêng bạn.",
            ].map((step, i) => (
              <li key={step} className="flex gap-2.5">
                <span className="shrink-0 w-6 h-6 rounded-full bg-wood-100 text-wood-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-5">
            {hasContact ? (
              <ContactButtons label="" />
            ) : (
              <p className="text-sm text-ink-500 bg-ivory-100 border border-navy-100 rounded-xl px-3.5 py-3">
                Bạn liên hệ trung tâm qua kênh quen thuộc (Zalo, Facebook hoặc số điện thoại của
                thầy cô) để được cấp lại mật khẩu.
              </p>
            )}
          </div>

          <p className="text-xs text-ink-400 mt-4">
            Sau khi đăng nhập được, bạn vào mục <span className="font-semibold">Đổi mật khẩu</span>{" "}
            để đặt mật khẩu riêng, không ai khác biết.
          </p>
        </div>

        <p className="text-center text-sm text-ink-500 mt-5">
          <Link href="/login" className="font-semibold text-wood-600 hover:text-wood-700">
            ← Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
