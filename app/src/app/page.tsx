import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { formatVND } from "@/lib/format";
import { PACKAGE_OPTIONS, PUBLIC_PRICE_TABLE, roleHomePath } from "@/lib/types";
import { Logo } from "@/components/logo";
import { IconChevronRight, SubjectIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Piano Guitar Đệm Hát",
  description: "Học phí các gói Guitar, Piano, Violin và Thanh nhạc tại Piano Guitar Đệm Hát.",
};

/** Bộ môn nào cũng dạy 1 kèm 1, học theo gói — số tiết lấy từ PACKAGE_OPTIONS để trang chủ khớp với các gói hệ thống thật sự hỗ trợ. */
export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-navy-950 text-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <Logo className="h-9 shrink-0" />
            <span className="font-bold text-base sm:text-lg truncate">Piano Guitar Đệm Hát</span>
          </Link>
          <Link
            href={session ? roleHomePath(session.role) : "/login"}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-3.5 py-2 text-sm font-semibold transition"
          >
            {session ? "Vào hệ thống" : "Đăng nhập"}
            <IconChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-navy-950 text-white">
          <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-14 pt-6 sm:pb-20">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-2xl leading-tight">
              Học Guitar, Piano, Violin và Thanh nhạc 1 kèm 1
            </h1>
            <p className="text-navy-200 mt-3 max-w-xl">
              Học viên chọn gói theo số tiết, học cố định hàng tuần hoặc hẹn linh động từng buổi.
            </p>
          </div>
        </section>

        <section id="bang-gia" className="max-w-5xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <h2 className="text-2xl font-bold text-ink-900 tracking-tight">Bảng giá</h2>
          <p className="text-ink-500 mt-1.5">Học phí trọn gói, đã bao gồm toàn bộ số tiết trong gói.</p>

          <div className="grid sm:grid-cols-2 gap-5 mt-7">
            {PUBLIC_PRICE_TABLE.map((group) => (
              <div
                key={group.subjects.join()}
                className="bg-white rounded-2xl border border-navy-100 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {group.subjects.map((subject) => (
                    <span
                      key={subject}
                      className="inline-flex items-center gap-1.5 font-semibold text-ink-900"
                    >
                      <SubjectIcon subject={subject} className="w-4.5 h-4.5 text-wood-500" />
                      {subject}
                    </span>
                  ))}
                </div>

                <dl className="mt-5 divide-y divide-navy-100">
                  {PACKAGE_OPTIONS.map((sessions) => {
                    const price = group.prices[sessions];
                    return (
                      <div key={sessions} className="flex items-baseline justify-between gap-3 py-3">
                        <dt className="text-ink-600 tabular">{sessions} tiết</dt>
                        <dd
                          className={
                            price
                              ? "text-lg font-bold text-ink-900 tabular"
                              : "text-sm font-medium text-ink-400"
                          }
                        >
                          {price ? formatVND(price) : "Liên hệ"}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-navy-100 bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
          <span>© {new Date().getFullYear()} Piano Guitar Đệm Hát</span>
          <Link href="/login" className="font-semibold text-wood-600 hover:text-wood-700">
            Đăng nhập hệ thống
          </Link>
        </div>
      </footer>
    </div>
  );
}
