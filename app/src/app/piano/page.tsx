import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { roleHomePath } from "@/lib/types";
import { CLEFS, MEMORY_TIPS, NOTE_VALUES, RHYTHM_TIPS } from "@/lib/piano";
import { Logo } from "@/components/logo";
import { MusicStaff } from "@/components/music-staff";
import { PianoKeys } from "@/components/piano-keys";
import { BeatBar, NoteValueGlyph } from "@/components/note-value";
import { IconChevronRight, IconMusic, IconPiano } from "@/components/icons";
import { ContactButtons } from "@/components/contact-buttons";
import { learningResourceJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import NoteGame from "./note-game";

const TITLE = "Thư viện piano — mẹo nhớ nốt khóa Sol, khóa Fa và game đọc nốt";
const DESC =
  "Mẹo nhớ nốt trên khuông nhạc khóa Sol và khóa Fa cho người mới học piano, kèm game đọc nốt để luyện phản xạ. Miễn phí, không cần đăng nhập.";

export const metadata: Metadata = {
  title: "Thư viện piano — mẹo nhớ nốt & game đọc nốt",
  description: DESC,
  alternates: { canonical: "/piano" },
  openGraph: { title: TITLE, description: DESC, url: "/piano" },
};

/** Vài nốt mẫu để minh họa cách đọc, kèm lời giải thích ngắn. */
const EXAMPLES = [
  { clef: "sol" as const, step: 0, note: "Đô giữa", why: "Dòng kẻ phụ ngay dưới khuông khóa Sol." },
  { clef: "sol" as const, step: 4, note: "Sol", why: "Đúng dòng kẻ thứ 2 — dòng mà khóa Sol chỉ vào." },
  { clef: "fa" as const, step: -4, note: "Fa", why: "Dòng kẻ thứ 4 — dòng nằm giữa hai chấm của khóa Fa." },
  { clef: "fa" as const, step: 0, note: "Đô giữa", why: "Dòng kẻ phụ ngay trên khuông khóa Fa." },
];

/**
 * Trang công khai: mẹo nhớ nốt và game đọc nốt cho người học piano.
 *
 * Cùng bộ với /guitar — thứ học viên dùng hằng ngày, đồng thời là cửa vào cho
 * người lạ tìm "cách nhớ nốt nhạc" trên mạng.
 */
export default async function PianoLibraryPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col">
      <JsonLd
        data={learningResourceJsonLd({
          path: "/piano",
          name: "Mẹo nhớ nốt khóa Sol, khóa Fa và game đọc nốt piano",
          description: "Cách nhớ nốt trên khuông nhạc khóa Sol và khóa Fa cho người mới học piano, kèm game đọc nốt để luyện phản xạ — miễn phí, không cần đăng nhập.",
          about: "Piano",
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
              href="/guitar"
              className="hidden sm:block text-sm font-medium text-ink-600 hover:text-ink-900 px-2 py-2"
            >
              Thư viện guitar
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
            <IconPiano className="w-5 h-5" />
            Thư viện piano · miễn phí
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 tracking-tight leading-tight mt-3 max-w-3xl">
            Nhớ nốt khóa Sol và khóa Fa — rồi luyện bằng game
          </h1>
          <p className="text-ink-600 mt-4 max-w-2xl">
            Đọc nốt là phản xạ chứ không phải trí nhớ. Dưới đây là cách nhớ nhanh nhất, chỗ mỗi nốt
            nằm trên bàn phím, cách tính nốt ngân bao lâu, và một game 20 câu để luyện mỗi ngày
            vài phút.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a
              href="#game"
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-950 hover:bg-navy-900 text-white px-5 py-2.5 font-semibold transition"
            >
              Chơi game đọc nốt
              <IconChevronRight className="w-4 h-4" />
            </a>
            <a
              href="#meo-nho"
              className="inline-flex items-center rounded-xl border border-navy-200 bg-white hover:bg-ivory-100 text-ink-700 px-5 py-2.5 font-semibold transition"
            >
              Xem mẹo nhớ nốt
            </a>
            <a
              href="#ban-phim"
              className="inline-flex items-center rounded-xl border border-navy-200 bg-white hover:bg-ivory-100 text-ink-700 px-5 py-2.5 font-semibold transition"
            >
              Nốt nằm ở phím nào
            </a>
            <a
              href="#truong-do"
              className="inline-flex items-center rounded-xl border border-navy-200 bg-white hover:bg-ivory-100 text-ink-700 px-5 py-2.5 font-semibold transition"
            >
              Nốt ngân bao lâu
            </a>
          </div>
        </section>

        {/* Bảng nốt trên khuông */}
        <section id="khuong-nhac" className="scroll-mt-20 max-w-6xl mx-auto px-5 sm:px-8 py-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
            Nốt nằm ở đâu trên khuông
          </h2>
          <p className="text-ink-500 mt-2 max-w-2xl">
            Khuông nhạc có 5 dòng kẻ và 4 khe. Dấu màu nâu trên mỗi khuông là chỗ khóa nhạc chỉ
            vào — đó là nốt neo để bạn đếm ra các nốt còn lại.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
            {(["sol", "fa"] as const).map((name) => {
              const clef = CLEFS[name];
              return (
                <div key={name} className="rounded-2xl border border-navy-100 bg-white p-5">
                  <h3 className="font-bold text-ink-900">{clef.fullLabel}</h3>
                  <div className="overflow-x-auto scroll-thin mt-3">
                    <MusicStaff clef={name} step={null} width={300} />
                  </div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="text-ink-500">5 dòng kẻ (từ dưới lên)</dt>
                      <dd className="font-bold text-ink-900">{clef.mnemonicLines}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">4 khe (từ dưới lên)</dt>
                      <dd className="font-bold text-ink-900">{clef.mnemonicSpaces}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Nốt neo</dt>
                      <dd className="font-semibold text-wood-700">
                        Dòng {clef.anchorLine} là nốt {clef.anchorNote}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>

          <h3 className="text-lg font-bold text-ink-900 mt-10">Đọc thử vài nốt</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {EXAMPLES.map((e) => (
              <div
                key={`${e.clef}-${e.step}`}
                className="rounded-2xl border border-navy-100 bg-white p-4"
              >
                <div className="overflow-x-auto scroll-thin">
                  <MusicStaff clef={e.clef} step={e.step} width={230} />
                </div>
                <div className="overflow-x-auto scroll-thin mt-1">
                  <PianoKeys step={e.step} octaves={2} fromStep={-7} />
                </div>
                <p className="font-bold text-ink-900 mt-2">{e.note}</p>
                <p className="text-xs text-ink-600 mt-1 leading-relaxed">{e.why}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bàn phím: chỗ nối giữa nốt trên giấy và phím trên đàn. */}
        <section id="ban-phim" className="scroll-mt-20 bg-ivory-100 border-y border-navy-100">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
              Từ nốt trên giấy tới phím trên đàn
            </h2>
            <p className="text-ink-600 mt-2 max-w-3xl">
              Đọc được tên nốt mới xong một nửa — còn phải biết bấm phím nào. Cách dò nhanh nhất
              là nhìn cụm phím đen: chúng đi thành cụm 2 rồi cụm 3, lặp đi lặp lại suốt cây đàn.
              <span className="font-semibold text-ink-900">
                {" "}Phím trắng nằm ngay bên trái cụm 2 phím đen luôn là nốt Đô.
              </span>
            </p>

            <div className="rounded-2xl border border-navy-100 bg-white p-5 mt-6">
              <div className="overflow-x-auto scroll-thin">
                <PianoKeys step={0} octaves={3} fromStep={-7} />
              </div>
              <p className="text-sm text-ink-600 mt-3 leading-relaxed">
                Phím tô nâu có vòng tròn là <span className="font-semibold">Đô giữa</span> — nốt
                nằm gần chính giữa đàn, cũng là nốt nối hai khuông nhạc khóa Sol và khóa Fa. Tìm
                được Đô giữa rồi thì mọi nốt khác chỉ việc đếm sang trái hoặc sang phải.
              </p>
            </div>
          </div>
        </section>

        {/* Game */}
        <section id="game" className="scroll-mt-20 bg-ivory-100 border-y border-navy-100">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
              Game: nốt này là nốt gì?
            </h2>
            <p className="text-ink-600 mt-2">
              Mỗi lượt 20 nốt. Chọn khóa Sol, khóa Fa, hoặc cả hai cho khó. Kỷ lục lưu ngay trong
              máy bạn.
            </p>
            <div className="mt-6">
              <NoteGame />
            </div>
          </div>
        </section>

        {/* Mẹo nhớ */}
        <section id="meo-nho" className="scroll-mt-20 max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
            Mẹo nhớ nốt
          </h2>
          <div className="grid grid-cols-1 [&>*]:min-w-0 sm:grid-cols-2 gap-4 mt-6">
            {MEMORY_TIPS.map((t) => (
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

        {/* Trường độ: vế thứ hai của việc đọc bản nhạc. */}
        <section id="truong-do" className="scroll-mt-20 bg-ivory-100 border-y border-navy-100">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
              Nốt ngân bao lâu
            </h2>
            <p className="text-ink-600 mt-2 max-w-3xl">
              Đọc bản nhạc là biết <span className="font-semibold text-ink-900">nốt gì</span> cộng{" "}
              <span className="font-semibold text-ink-900">ngân bao lâu</span>. Phần trên lo vế
              đầu, phần này lo vế sau. Số phách dưới đây tính theo nhịp 4/4 — nhịp bạn gặp nhiều
              nhất.
            </p>

            <div className="grid grid-cols-1 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {NOTE_VALUES.map((v) => (
                <div key={v.id} className="rounded-2xl border border-navy-100 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <NoteValueGlyph value={v} />
                    <div className="min-w-0">
                      <h3 className="font-bold text-ink-900">{v.name}</h3>
                      <p className="text-xs text-ink-500">
                        {v.filled ? "Đầu đặc" : "Đầu rỗng"}
                        {v.stem ? " · có đuôi" : " · không đuôi"}
                        {v.flags > 0 ? ` · ${v.flags} móc` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <BeatBar beats={v.beats} />
                  </div>
                  <p className="text-sm text-ink-600 mt-3 leading-relaxed">{v.text}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 [&>*]:min-w-0 sm:grid-cols-2 gap-4 mt-6">
              {RHYTHM_TIPS.map((t) => (
                <div key={t.title} className="rounded-2xl border border-navy-100 bg-white p-5">
                  <h3 className="font-semibold text-ink-900 flex items-start gap-2">
                    <IconMusic className="w-5 h-5 text-wood-500 shrink-0 mt-0.5" />
                    {t.title}
                  </h3>
                  <p className="text-sm text-ink-600 mt-1.5 leading-relaxed">{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-navy-950 text-white">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Đọc được nốt rồi, giờ đặt tay lên đàn
            </h2>
            <p className="text-navy-200 mt-3">
              Một buổi học thử miễn phí: giáo viên chỉnh tư thế tay, cách đặt ngón và chọn bài phù
              hợp với bạn ngay từ đầu.
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
                href="/guitar"
                className="inline-flex items-center rounded-xl border border-white/25 hover:bg-white/10 text-white px-6 py-3 font-semibold transition"
              >
                Thư viện guitar
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
