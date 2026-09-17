import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { roleHomePath } from "@/lib/types";
import { Logo } from "@/components/logo";
import { IconChevronRight, IconGuitar, IconMusic } from "@/components/icons";
import { ContactButtons } from "@/components/contact-buttons";
import ChordLibrary from "./chord-library";
import ProgressionExplorer from "./progression-explorer";

const TITLE = "Thư viện hợp âm & vòng hòa thanh guitar";
const DESC =
  "Tra thế bấm 33 hợp âm guitar (có số ngón), xem bảy hợp âm của mỗi tông và 9 vòng hòa thanh thông dụng — 1-5-6-4, Canon, 2-5-1 — đổi được theo 10 tông. Miễn phí, không cần đăng nhập.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/guitar" },
  openGraph: { title: `${TITLE} · Piano Guitar Đệm Hát`, description: DESC, url: "/guitar" },
};

const PRACTICE_TIPS = [
  {
    title: "Tập đổi hợp âm trước, tập bài sau",
    text: "Chọn hai hợp âm, đổi qua lại 60 lần trong một phút. Đổi mượt rồi mới ghép vào bài — không thì bài nào cũng vấp ở đúng chỗ đổi.",
  },
  {
    title: "Bấm sát ngăn, đừng bấm giữa ô",
    text: "Đầu ngón đặt ngay sát thanh ngăn phía dưới, lực nhẹ hơn nhiều mà tiếng vẫn rõ. Tiếng rè thường là do bấm xa ngăn chứ không phải do yếu tay.",
  },
  {
    title: "Chưa chặn được F là bình thường",
    text: "Dùng tạm Fmaj7 (4 dây mỏng) để chơi hết bài, rồi mỗi ngày tập chặn 5 phút. Vài tuần là được, không cần khổ luyện một hôm.",
  },
  {
    title: "Học theo vòng, đừng học theo từng bài",
    text: "Nắm vòng 1-5-6-4 và 1-6-4-5 là đệm được rất nhiều bài mà không cần nhìn hợp âm — nghe ra vòng là bắt được bài.",
  },
];

/**
 * Trang công khai, không cần đăng nhập: thư viện hợp âm và vòng hòa thanh.
 *
 * Vừa là thứ học viên đang học tra hằng ngày, vừa là cửa vào cho người lạ tìm
 * "hợp âm guitar" trên mạng — nên cuối trang có lối đăng ký học thử.
 */
export default async function GuitarLibraryPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-ivory-50/90 backdrop-blur border-b border-navy-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <Logo className="h-9 shrink-0" />
            <span className="font-bold text-ink-900 text-sm sm:text-base truncate">
              Piano Guitar Đệm Hát
            </span>
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link
              href="/piano"
              className="hidden sm:block text-sm font-medium text-ink-600 hover:text-ink-900 px-2 py-2"
            >
              Thư viện piano
            </Link>
            <Link
              href={session ? roleHomePath(session.role) : "/login"}
              className="text-sm font-medium text-ink-600 hover:text-ink-900 px-2 py-2"
            >
              {session ? "Vào hệ thống" : "Đăng nhập"}
            </Link>
            <Link
              href="/#hoc-thu"
              className="inline-flex items-center gap-1 rounded-xl bg-coral-600 hover:bg-coral-700 text-white px-3.5 py-2 text-sm font-semibold transition whitespace-nowrap"
            >
              Học thử miễn phí
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-8 sm:pt-16">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-wood-600">
            <IconGuitar className="w-5 h-5" />
            Thư viện guitar · miễn phí
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 tracking-tight leading-tight mt-3 max-w-3xl">
            Hợp âm và vòng hòa thanh cho người mới tập đệm hát
          </h1>
          <p className="text-ink-600 mt-4 max-w-2xl">
            Tra thế bấm từng hợp âm, xem bảy hợp âm của mỗi tông, và học các vòng hòa thanh mà hầu
            hết bài hát đang dùng. Không cần đăng nhập, mở trên điện thoại lúc đang ôm đàn cũng
            được.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a
              href="#hop-am"
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-950 hover:bg-navy-900 text-white px-5 py-2.5 font-semibold transition"
            >
              Xem thế bấm hợp âm
              <IconChevronRight className="w-4 h-4" />
            </a>
            <a
              href="#vong-hoa-thanh"
              className="inline-flex items-center rounded-xl border border-navy-200 bg-white hover:bg-ivory-100 text-ink-700 px-5 py-2.5 font-semibold transition"
            >
              Vòng hòa thanh theo tông
            </a>
          </div>
        </section>

        <section id="hop-am" className="scroll-mt-20 max-w-6xl mx-auto px-5 sm:px-8 py-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
            Thế bấm hợp âm
          </h2>
          <p className="text-ink-500 mt-2 max-w-2xl">
            Số trong chấm tròn là ngón tay: 1 trỏ, 2 giữa, 3 áp út, 4 út. Dấu{" "}
            <span className="font-semibold text-ink-700">o</span> là dây buông (vẫn đánh),{" "}
            <span className="font-semibold text-ink-700">x</span> là dây không đánh.
          </p>
          <div className="mt-6">
            <ChordLibrary />
          </div>
        </section>

        <section id="vong-hoa-thanh" className="scroll-mt-20 bg-ivory-100 border-y border-navy-100">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
              Vòng hòa thanh
            </h2>
            <p className="text-ink-600 mt-2 max-w-2xl">
              Hợp âm trong một bài không đi lung tung mà chạy theo vài đường quen thuộc. Nhớ vòng
              thì đệm được bài chưa từng nghe — chọn tông bên dưới để xem vòng đó gồm hợp âm nào.
            </p>
            <div className="mt-7">
              <ProgressionExplorer />
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
            Mẹo tập cho người mới
          </h2>
          <div className="grid grid-cols-1 [&>*]:min-w-0 sm:grid-cols-2 gap-4 mt-6">
            {PRACTICE_TIPS.map((t) => (
              <div key={t.title} className="rounded-2xl border border-navy-100 bg-white p-5">
                <h3 className="font-semibold text-ink-900 flex items-start gap-2">
                  <IconMusic className="w-5 h-5 text-wood-500 shrink-0 mt-0.5" />
                  {t.title}
                </h3>
                <p className="text-sm text-ink-600 mt-1.5 leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-navy-950 text-white">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Tập một mình mãi không lên tay?
            </h2>
            <p className="text-navy-200 mt-3">
              Một buổi học thử miễn phí với giáo viên, sửa đúng chỗ tay bạn đang sai — thường nhanh
              hơn cả tháng tự mò.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Link
                href="/#hoc-thu"
                className="inline-flex items-center gap-1.5 rounded-xl bg-coral-600 hover:bg-coral-700 text-white px-6 py-3 font-semibold transition"
              >
                Đăng ký học thử miễn phí
                <IconChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/piano"
                className="inline-flex items-center rounded-xl border border-white/25 hover:bg-white/10 text-white px-6 py-3 font-semibold transition"
              >
                Thư viện piano
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-7 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
          <span>© {new Date().getFullYear()} Piano Guitar Đệm Hát</span>
          <Link href="/" className="font-semibold text-wood-600 hover:text-wood-700">
            Về trang chủ
          </Link>
        </div>
      </footer>

      <ContactButtons variant="floating" />
    </div>
  );
}
