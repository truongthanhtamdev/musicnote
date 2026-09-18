import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getCenterContact } from "@/lib/queries";
import { courseJsonLd, schoolJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { roleHomePath } from "@/lib/types";
import { Logo } from "@/components/logo";
import {
  IconCheck,
  IconChevronRight,
  IconClock,
  IconGuitar,
  IconPiano,
  IconUsers,
  SubjectIcon,
} from "@/components/icons";
import { ContactButtons } from "@/components/contact-buttons";
import { PricingTabs } from "./pricing-tabs";
import { TrialForm } from "./trial-form";

const HOME_TITLE = "Piano Guitar Đệm Hát — Học 1 kèm 1 online";
const HOME_DESC =
  "Guitar, Piano, Violin, Saxophone, Thanh nhạc và Toán, Tiếng Việt, Tiếng Anh — học 1 kèm 1 online 60 phút/buổi, giáo viên song ngữ Việt–Anh. Học thử 1 buổi miễn phí.";

export const metadata: Metadata = {
  // absolute: tiêu đề trang chủ không cần gắn thêm tên trung tâm phía sau.
  title: { absolute: HOME_TITLE },
  description: HOME_DESC,
  alternates: { canonical: "/" },
  openGraph: { title: HOME_TITLE, description: HOME_DESC, url: "/" },
};

/**
 * Bộ môn hiện lên trang chủ. Tách hai nhóm vì khách tìm lớp nhạc và khách tìm
 * lớp kèm văn hoá là hai nhóm khác nhau — gộp một lưới 8 ô thì cả hai đều
 * phải đọc lướt qua phần không liên quan.
 *
 * Mô tả cố ý ngắn và chung chung, chủ trung tâm sửa lại theo đúng chương
 * trình thật của mình được ngay ở đây.
 */
const SUBJECT_GROUPS = [
  {
    label: "Âm nhạc",
    items: [
      { name: "Guitar", text: "Đệm hát, fingerstyle, solo — học được từ con số 0." },
      { name: "Piano", text: "Đệm hát và cổ điển, cho cả người lớn lẫn các bé." },
      { name: "Violin", text: "Tư thế, cách kéo vĩ và những bản nhạc đầu tiên." },
      { name: "Saxophone", text: "Hơi, ngón bấm và các bài quen thuộc." },
      { name: "Thanh nhạc", text: "Luyện hơi, luyện giọng, xử lý bài hát." },
    ],
  },
  {
    label: "Văn hoá",
    items: [
      { name: "Toán", text: "Kèm bài trên lớp, lấy lại gốc, luyện đề theo trình độ." },
      { name: "Tiếng Việt", text: "Tập đọc, chính tả, tập làm văn cho bậc tiểu học." },
      { name: "Tiếng Anh", text: "Giao tiếp, ngữ pháp và luyện thi theo mục tiêu của bạn." },
    ],
  },
];

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
  const contact = getCenterContact();
  const subjects = SUBJECT_GROUPS.flatMap((g) => g.items);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nói thẳng cho máy biết đây là trung tâm gì, dạy môn nào, giá bao
          nhiêu — thay vì bắt nó đoán từ chữ trên trang. */}
      <JsonLd data={schoolJsonLd(contact)} />
      {courseJsonLd(subjects).map((c) => (
        <JsonLd key={c.name} data={c} />
      ))}
      <header className="sticky top-0 z-30 bg-ivory-50/90 backdrop-blur border-b border-navy-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <Logo className="h-9 shrink-0" />
            <span className="font-bold text-ink-900 text-sm sm:text-base truncate">
              Piano Guitar Đệm Hát
            </span>
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Hai thư viện hiện sớm hơn Bộ môn và Học phí: đó là thứ người lạ
                vào xem trước khi quan tâm tới học phí, mà cũng là thứ mang
                khách từ Google về. */}
            <a
              href="#bo-mon"
              className="hidden lg:block text-sm font-medium text-ink-600 hover:text-ink-900 px-2 py-2"
            >
              Bộ môn
            </a>
            <Link
              href="/guitar"
              className="hidden md:block text-sm font-medium text-ink-600 hover:text-ink-900 px-2 py-2"
            >
              Thư viện guitar
            </Link>
            <Link
              href="/piano"
              className="hidden md:block text-sm font-medium text-ink-600 hover:text-ink-900 px-2 py-2"
            >
              Thư viện piano
            </Link>
            <a
              href="#hoc-phi"
              className="hidden lg:block text-sm font-medium text-ink-600 hover:text-ink-900 px-2 py-2"
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
            Piano · Guitar · Violin · Saxophone · Thanh nhạc · Toán · Tiếng Việt · Tiếng Anh
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold text-ink-900 tracking-tight leading-tight mt-3 max-w-3xl">
            Học 1 kèm 1 online, giáo viên song ngữ Việt–Anh
          </h1>
          <p className="text-ink-600 text-base sm:text-lg mt-4 max-w-2xl">
            Nhạc cụ, thanh nhạc và cả Toán, Tiếng Việt, Tiếng Anh — 60 phút mỗi buổi, lịch học
            linh hoạt theo múi giờ của bạn. Học thử 1 buổi miễn phí trước khi quyết định đăng ký
            gói.
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

        {/* Bộ môn */}
        <section
          id="bo-mon"
          className="scroll-mt-20 max-w-6xl mx-auto px-5 sm:px-8 pb-4 sm:pb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
            Các môn trung tâm đang dạy
          </h2>
          <p className="text-ink-500 mt-2">
            Môn nào cũng học 1 kèm 1 online, 60 phút mỗi buổi, buổi đầu học thử miễn phí.
          </p>

          {SUBJECT_GROUPS.map((group) => (
            <div key={group.label} className="mt-8">
              <p className="text-xs font-bold uppercase tracking-wide text-wood-600">
                {group.label}
              </p>
              <div className="grid grid-cols-1 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3.5">
                {group.items.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-2xl border border-navy-100 bg-white p-5 flex gap-3.5"
                  >
                    <span className="shrink-0 rounded-xl bg-ivory-100 text-wood-600 p-2.5 h-fit">
                      <SubjectIcon subject={item.name} className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink-900">{item.name}</h3>
                      <p className="text-sm text-ink-600 mt-1 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Thư viện guitar miễn phí — vừa hữu ích cho học viên, vừa là cửa
            vào cho người lạ tìm "hợp âm guitar" trên mạng. */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-12 sm:pb-16">
          <div className="rounded-2xl border border-navy-100 bg-white p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-wood-600">
                <IconGuitar className="w-5 h-5" />
                Miễn phí, không cần đăng nhập
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-ink-900 tracking-tight mt-2">
                Thư viện học nhạc miễn phí
              </h2>
              <p className="text-ink-600 mt-1.5 max-w-xl">
                Guitar: thế bấm hợp âm và vòng hòa thanh theo từng tông. Piano: mẹo nhớ nốt khóa
                Sol, khóa Fa và game đọc nốt.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/guitar"
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy-950 hover:bg-navy-900 text-white px-5 py-3 font-semibold transition"
              >
                <IconGuitar className="w-4 h-4" />
                Guitar
              </Link>
              <Link
                href="/piano"
                className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white hover:bg-ivory-100 text-ink-700 px-5 py-3 font-semibold transition"
              >
                <IconPiano className="w-4 h-4" />
                Piano
              </Link>
            </div>
          </div>
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
          {/* Lớp văn hoá chưa niêm yết giá: học phí tuỳ cấp lớp và mục tiêu,
              ghi bừa một con số lên trang chủ rồi báo giá khác là mất khách. */}
          <p className="text-sm text-ink-600 mt-7 rounded-2xl border border-navy-100 bg-white px-4 py-3.5">
            Lớp{" "}
            <span className="font-semibold text-ink-900">
              Saxophone, Toán, Tiếng Việt, Tiếng Anh
            </span>{" "}
            có học phí tuỳ theo cấp lớp và mục tiêu của học viên —{" "}
            <a href="#hoc-thu" className="font-semibold text-wood-600 hover:text-wood-700">
              để lại thông tin
            </a>{" "}
            để trung tâm báo giá đúng nhu cầu của bạn.
          </p>
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

      <ContactButtons variant="floating" />
    </div>
  );
}
