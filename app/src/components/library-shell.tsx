import Link from "next/link";
import { getSession } from "@/lib/auth";
import { roleHomePath } from "@/lib/types";
import { Logo } from "@/components/logo";
import { ContactButtons } from "@/components/contact-buttons";
import { IconChevronRight } from "@/components/icons";
import { LIBRARY_SECTIONS, type LibrarySection, type LibraryTopic } from "@/lib/library";

/**
 * Khung chung cho mọi trang thư viện: đầu trang, dấu vết đường dẫn, chân
 * trang, nút liên hệ. Mười hai trang dùng chung một khung thay vì chép qua
 * chép lại — sửa menu một chỗ là cả mười hai trang đổi theo.
 */
export async function LibraryShell({
  section,
  topic,
  children,
}: {
  section: LibrarySection;
  /** Bỏ trống nếu đây là trang tổng của nhóm. */
  topic?: LibraryTopic;
  children: React.ReactNode;
}) {
  const session = await getSession();
  const other = LIBRARY_SECTIONS.find((s) => s.root !== section.root);

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
            {other && (
              <Link
                href={other.root}
                className="hidden md:block text-sm font-medium text-ink-600 hover:text-ink-900 px-2 py-2"
              >
                {other.rootName}
              </Link>
            )}
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

      {topic && (
        <nav
          aria-label="Đường dẫn"
          className="max-w-6xl mx-auto w-full px-5 sm:px-8 pt-5 text-sm text-ink-500"
        >
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-ink-900">
                Trang chủ
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link href={section.root} className="hover:text-ink-900">
                {section.rootName}
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li className="font-medium text-ink-800">{topic.name}</li>
          </ol>
        </nav>
      )}

      <main className="flex-1">{children}</main>

      {/* Trang nào cũng dẫn tiếp sang các chủ đề còn lại: người đọc đi tiếp
          được, mà máy tìm kiếm cũng lần ra hết các trang con. */}
      <section className="bg-ivory-100 border-t border-navy-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
          <h2 className="text-lg font-bold text-ink-900">Xem tiếp trong {section.rootName.toLowerCase()}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {section.topics
              .filter((t) => t.path !== topic?.path)
              .map((t) => (
                <Link
                  key={t.path}
                  href={t.path}
                  className="group rounded-xl border border-navy-100 bg-white hover:border-wood-300 p-4 transition"
                >
                  <p className="font-semibold text-ink-900 flex items-center gap-1">
                    {t.name}
                    <IconChevronRight className="w-4 h-4 text-ink-300 group-hover:text-wood-600 transition" />
                  </p>
                  <p className="text-sm text-ink-600 mt-1 leading-relaxed">{t.blurb}</p>
                </Link>
              ))}
            {other && (
              <Link
                href={other.root}
                className="group rounded-xl border border-navy-100 bg-white hover:border-wood-300 p-4 transition"
              >
                <p className="font-semibold text-ink-900 flex items-center gap-1">
                  {other.rootName}
                  <IconChevronRight className="w-4 h-4 text-ink-300 group-hover:text-wood-600 transition" />
                </p>
                <p className="text-sm text-ink-600 mt-1 leading-relaxed">
                  Sang thư viện còn lại — cũng miễn phí, cũng không cần đăng nhập.
                </p>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="bg-navy-950 text-white">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Tự tập mãi vẫn thấy vướng?
          </h2>
          <p className="text-navy-200 mt-3">
            Một buổi học thử miễn phí với giáo viên, sửa đúng chỗ bạn đang sai — thường nhanh hơn
            cả tháng tự mò.
          </p>
          <Link
            href="/#hoc-thu"
            className="inline-flex items-center gap-1.5 rounded-xl bg-coral-600 hover:bg-coral-700 text-white px-6 py-3 font-semibold mt-6 transition"
          >
            Đăng ký học thử miễn phí
            <IconChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-7 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
          <span>
            © {new Date().getFullYear()} Piano Guitar Đệm Hát · Tiếng đàn:{" "}
            <a
              href="https://github.com/gleitz/midi-js-soundfonts"
              className="underline hover:text-ink-700"
              rel="noopener"
              target="_blank"
            >
              FluidR3_GM
            </a>{" "}
            (CC BY 3.0)
          </span>
          <Link href="/" className="font-semibold text-wood-600 hover:text-wood-700">
            Về trang chủ
          </Link>
        </div>
      </footer>

      <ContactButtons variant="floating" />
    </div>
  );
}

/**
 * Đầu trang chủ đề: tiêu đề rồi ĐOẠN TRẢ LỜI THẲNG.
 *
 * Đoạn trả lời phải nằm ngay trên cùng và nói đúng vào câu hỏi, vì cả Google
 * lẫn công cụ AI đều trích đoạn trả lời trực tiếp chứ không trích đoạn dẫn
 * nhập văn vẻ. Viết "Khóa Fa chỉ vào dòng kẻ thứ 4" thì được trích, viết
 * "âm nhạc là ngôn ngữ của tâm hồn" thì không.
 */
export function TopicHero({
  eyebrow,
  title,
  answer,
  children,
}: {
  eyebrow: React.ReactNode;
  title: string;
  answer: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 pb-6 sm:pt-10">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-wood-600">{eyebrow}</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 tracking-tight leading-tight mt-3 max-w-3xl">
        {title}
      </h1>
      <div className="text-ink-700 mt-4 max-w-3xl text-lg leading-relaxed [&_strong]:text-ink-900">
        {answer}
      </div>
      {children}
    </section>
  );
}
