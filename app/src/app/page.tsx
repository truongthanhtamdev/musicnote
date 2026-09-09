import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { roleHomePath } from "@/lib/types";
import { Logo } from "@/components/logo";
import { IconCheck, IconChevronRight, IconClock, IconUsers } from "@/components/icons";
import { PricingTabs } from "./pricing-tabs";
import { TrialForm } from "./trial-form";

export const metadata: Metadata = {
  title: "Piano Guitar Đệm Hát — Học nhạc 1 kèm 1 online",
  description:
    "Guitar, Piano, Violin, Thanh nhạc — học 1 kèm 1 online 60 phút/buổi, giáo viên song ngữ Việt–Anh. Học thử 1 buổi miễn phí.",
};

const BILINGUAL_POINTS = [
  {
    title: "Dạy được bằng tiếng Anh",
    text: "Học viên ở nước ngoài hoặc quen dùng thuật ngữ tiếng Anh vẫn theo lớp thoải mái.",
  },
  {
    title: "Hợp với gia đình xa quê",
    text: "Ba mẹ trao đổi tiếng Việt, con học tiếng Anh — cùng một giáo viên, không cần phiên dịch.",
  },
  {
    title: "Ghép đúng giáo viên ngay từ đầu",
    text: "Bạn chọn ngôn ngữ khi đăng ký, trung tâm xếp giáo viên phù hợp cho buổi học thử.",
  },
];

export default async function HomePage() {
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
            <a
              href="#hoc-phi"
              className="hidden sm:block text-sm font-medium text-ink-600 hover:text-ink-900 px-2 py-2"
            >
              Học phí
            </a>
            <Link
              href={session ? roleHomePath(session.role) : "/login"}
              className="text-sm font-medium text-ink-600 hover:text-ink-900 px-2 py-2"
            >
              {session ? "Vào hệ thống" : "Đăng nhập"}
            </Link>
            <a
              href="#hoc-thu"
              className="inline-flex items-center gap-1 rounded-xl bg-coral-600 hover:bg-coral-700 text-white px-3.5 py-2 text-sm font-semibold transition whitespace-nowrap"
            >
              Học thử miễn phí
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 pb-12 sm:pt-20 sm:pb-16">
          <p className="text-sm font-semibold text-wood-600 tracking-wide">
            Piano · Guitar · Violin · Thanh Nhạc
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold text-ink-900 tracking-tight leading-tight mt-3 max-w-3xl">
            Học nhạc 1 kèm 1 online, giáo viên song ngữ Việt–Anh
          </h1>
          <p className="text-ink-600 text-base sm:text-lg mt-4 max-w-2xl">
            60 phút mỗi buổi, lịch học linh hoạt theo múi giờ của bạn. Học thử 1 buổi miễn phí
            trước khi quyết định đăng ký gói.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <a
              href="#hoc-thu"
              className="inline-flex items-center gap-1.5 rounded-xl bg-coral-600 hover:bg-coral-700 text-white px-6 py-3 font-semibold transition"
            >
              Đăng ký học thử miễn phí
              <IconChevronRight className="w-4 h-4" />
            </a>
            <a
              href="#hoc-phi"
              className="inline-flex items-center rounded-xl border border-navy-200 bg-white hover:bg-ivory-100 text-ink-700 px-6 py-3 font-semibold transition"
            >
              Xem học phí
            </a>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 mt-8 text-sm text-ink-600">
            {[
              "Học 1 kèm 1 qua Zoom/Meet",
              "60 phút mỗi buổi",
              "Lịch linh hoạt theo múi giờ",
            ].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <IconCheck className="w-4 h-4 text-mint-600 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* Giáo viên song ngữ */}
        <section className="bg-navy-950 text-white">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide">
              <IconUsers className="w-4 h-4" />
              GIÁO VIÊN SONG NGỮ
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-4 max-w-2xl leading-tight">
              Dạy được cả tiếng Việt lẫn tiếng Anh
            </h2>
            <p className="text-navy-200 mt-3 max-w-2xl">
              Đây là điểm khác biệt của trung tâm: bạn chọn ngôn ngữ muốn học, giáo viên dạy bằng
              đúng ngôn ngữ đó.
            </p>

            <div className="grid grid-cols-1 [&>*]:min-w-0 sm:grid-cols-3 gap-5 mt-9">
              {BILINGUAL_POINTS.map((p) => (
                <div key={p.title} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-navy-200 text-sm mt-1.5 leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Học phí */}
        <section id="hoc-phi" className="scroll-mt-20 max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">Học phí</h2>
          <p className="text-ink-500 mt-2">
            Học phí trọn gói, đã gồm toàn bộ số buổi trong gói. Gói càng lớn, đơn giá mỗi buổi càng
            rẻ.
          </p>
          <div className="mt-8">
            <PricingTabs />
          </div>
        </section>

        {/* Đăng ký học thử */}
        <section id="hoc-thu" className="scroll-mt-20 bg-ivory-100 border-y border-navy-100">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
              Đăng ký học thử miễn phí
            </h2>
            <p className="text-ink-600 mt-2 flex items-start gap-1.5">
              <IconClock className="w-4 h-4 mt-1 shrink-0 text-wood-500" />
              <span>
                Để lại thông tin, trung tâm liên hệ xếp buổi học thử 60 phút — miễn phí và không
                ràng buộc.
              </span>
            </p>
            <div className="mt-7">
              <TrialForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-7 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
          <span>© {new Date().getFullYear()} Piano Guitar Đệm Hát</span>
          <Link href="/login" className="font-semibold text-wood-600 hover:text-wood-700">
            Đăng nhập hệ thống
          </Link>
        </div>
      </footer>
    </div>
  );
}
