import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { roleHomePath } from "@/lib/types";
import { Logo } from "@/components/logo";
import { IconChevronRight, IconGuitar, IconMusic } from "@/components/icons";
import { ContactButtons } from "@/components/contact-buttons";
import { STRUM_PATTERNS } from "@/lib/strum";
import { StrumGrid, StrumLegend } from "@/components/strum-grid";
import { Metronome } from "@/components/metronome";
import ChordQuiz from "./chord-quiz";
import ChordSwitchDrill from "./chord-switch-drill";
import CapoTable from "./capo-table";
import { learningResourceJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
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
      <JsonLd
        data={learningResourceJsonLd({
          path: "/guitar",
          name: "Thư viện hợp âm và vòng hòa thanh guitar",
          description: "Thế bấm của từng hợp âm guitar, bảy hợp âm của mỗi tông và các vòng hòa thanh thông dụng — tra miễn phí, không cần đăng nhập.",
          about: "Guitar",
        })}
      />
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
            Thế bấm từng hợp âm, bảy hợp âm của mỗi tông, các vòng hòa thanh mà hầu hết bài hát
            đang dùng, và điệu đệm cho tay phải. Không cần đăng nhập, mở trên điện thoại lúc đang
            ôm đàn cũng được.
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
            <a
              href="#dieu"
              className="inline-flex items-center rounded-xl border border-navy-200 bg-white hover:bg-ivory-100 text-ink-700 px-5 py-2.5 font-semibold transition"
            >
              Điệu đệm
            </a>
            <a
              href="#luyen-tap"
              className="inline-flex items-center rounded-xl border border-navy-200 bg-white hover:bg-ivory-100 text-ink-700 px-5 py-2.5 font-semibold transition"
            >
              Game &amp; luyện tập
            </a>
            <a
              href="#capo"
              className="inline-flex items-center rounded-xl border border-navy-200 bg-white hover:bg-ivory-100 text-ink-700 px-5 py-2.5 font-semibold transition"
            >
              Bảng capo
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
            <span className="font-semibold text-ink-700">x</span> là dây không đánh. Bấm{" "}
            <span className="font-semibold text-ink-700">Nghe</span> để nghe hợp âm kêu thế nào,{" "}
            <span className="font-semibold text-ink-700">Rải</span> để nghe từng dây — dò xem dây nào
            mình bấm chưa kêu.
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

        {/* Điệu: mảnh còn thiếu giữa "biết hợp âm" và "đệm được bài". */}
        <section id="dieu" className="scroll-mt-20 max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
            Điệu đệm — tay phải làm gì
          </h2>
          <p className="text-ink-600 mt-2 max-w-3xl">
            Biết hợp âm mới xong một nửa. Nửa còn lại là tay phải.
          </p>
          <p className="text-ink-600 mt-3 max-w-3xl">
            Có hai kiểu: <span className="font-semibold text-ink-900">quạt</span> là gạt cả chùm
            dây cùng lúc, nghe dày và khoẻ — hợp bài nhanh, hợp hát tập thể.{" "}
            <span className="font-semibold text-ink-900">Rải</span> là khảy từng dây một, nghe
            trong và nhẹ — hợp bài chậm, hợp đoạn mở đầu. Cùng một bài có thể rải đoạn đầu rồi
            quạt khi vào điệp khúc.
          </p>
          <p className="text-ink-600 mt-3 max-w-3xl">
            Mỗi cột dưới đây là một khoảng thời gian bằng nhau — đọc từ trái sang phải, đếm đều
            theo số ghi ở trên.
          </p>
          <div className="rounded-2xl border border-navy-100 bg-white p-4 sm:p-5 mt-5">
            <StrumLegend />
          </div>

          <div className="grid grid-cols-1 [&>*]:min-w-0 lg:grid-cols-2 gap-5 mt-5">
            {STRUM_PATTERNS.map((pat) => (
              <div key={pat.id} className="rounded-2xl border border-navy-100 bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-ink-900 text-lg">{pat.name}</h3>
                  <span className="rounded-full bg-ivory-100 text-ink-600 px-2.5 py-0.5 text-xs font-semibold">
                    {pat.hand}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      pat.level === "Dễ"
                        ? "bg-mint-50 text-mint-700"
                        : pat.level === "Vừa"
                          ? "bg-wood-50 text-wood-700"
                          : "bg-coral-50 text-coral-700"
                    }`}
                  >
                    {pat.level}
                  </span>
                </div>
                <p className="text-sm text-ink-500 mt-1">
                  Nhịp {pat.meter} · khoảng {pat.tempo} phách/phút
                </p>

                <div className="mt-4">
                  <StrumGrid pattern={pat} />
                </div>

                <p className="text-sm text-ink-600 mt-4 leading-relaxed">{pat.description}</p>
                <p className="text-sm text-ink-500 mt-2">
                  <span className="font-semibold text-ink-700">Hay dùng cho:</span> {pat.songs}
                </p>
                <p className="text-sm text-wood-700 mt-3 leading-relaxed border-t border-navy-100 pt-3">
                  <span className="font-semibold">Mẹo:</span> {pat.tip}
                </p>
              </div>
            ))}
          </div>

          <p className="text-sm text-ink-500 mt-6 max-w-3xl leading-relaxed">
            Điệu nào cũng có nhiều biến thể tuỳ người dạy và tuỳ bài. Đây là bản phổ biến nhất,
            đủ để đệm được bài thật — tập chắc rồi thì tự biến tấu thêm.
          </p>
        </section>

        {/* Chơi và luyện: game đoán hợp âm, bài tập đổi hợp âm, máy đếm nhịp. */}
        <section id="luyen-tap" className="scroll-mt-20 bg-ivory-100 border-y border-navy-100">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
              Game &amp; luyện tập mỗi ngày
            </h2>
            <p className="text-ink-600 mt-2 max-w-3xl">
              Mỗi thứ dưới đây 1–3 phút. Kỷ lục lưu ngay trong máy bạn, hôm sau vào chơi tiếp thấy
              số tăng là biết mình tiến bộ.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6 [&>*]:min-w-0">
              <ChordQuiz />
              <ChordSwitchDrill />
            </div>
            <div className="mt-5">
              <Metronome />
            </div>
          </div>
        </section>

        <section id="capo" className="scroll-mt-20 max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
            Bảng capo
          </h2>
          <p className="text-ink-600 mt-2 max-w-3xl">
            Bài ở tông khó bấm thì không ai bấm chặn cả bài — kẹp capo rồi bấm thế dễ. Bảng này
            trả lời &ldquo;kẹp ngăn mấy&rdquo; và &ldquo;kẹp rồi thì ra tông gì&rdquo;.
          </p>
          <div className="mt-6">
            <CapoTable />
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
          <span>
            © {new Date().getFullYear()} Piano Guitar Đệm Hát · Tiếng đàn:{" "}
            <a href="https://github.com/gleitz/midi-js-soundfonts" className="underline hover:text-ink-700" rel="noopener" target="_blank">
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
