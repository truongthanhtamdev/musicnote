import type { Metadata } from "next";
import Link from "next/link";
import { PIANO_LIBRARY } from "@/lib/library";
import { LibraryShell } from "@/components/library-shell";
import { JsonLd } from "@/components/json-ld";
import { learningResourceJsonLd } from "@/lib/seo";
import { IconPiano, IconChevronRight } from "@/components/icons";

const SECTION = PIANO_LIBRARY;

const TITLE = "Thư viện piano miễn phí cho người mới";
const DESC = "Mẹo nhớ nốt khóa Sol và khóa Fa, nốt nằm ở phím nào trên đàn, trường độ nốt, 7 hợp âm tông Đô và game đọc nốt, luyện tai. Miễn phí, không cần đăng nhập.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: SECTION.root },
  openGraph: { title: `${TITLE} · Piano Guitar Đệm Hát`, description: DESC, url: SECTION.root },
};

/**
 * Trang tổng của thư viện: chỉ giới thiệu và dẫn sang từng chủ đề.
 *
 * Cố ý KHÔNG lặp lại nội dung của các trang con. Trước đây trang này ôm cả
 * năm chủ đề nên không thắng nổi chủ đề nào trên Google; giờ mỗi chủ đề có
 * địa chỉ riêng, trang tổng chỉ làm nhiệm vụ dẫn đường. Để nội dung ở cả hai
 * nơi là tự cạnh tranh với chính mình.
 */
export default function Page() {
  return (
    <LibraryShell section={SECTION}>
      <JsonLd
        data={learningResourceJsonLd({
          path: SECTION.root,
          name: TITLE,
          description: DESC,
          about: "Piano",
        })}
      />

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-8 sm:pt-16">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-wood-600">
          <IconPiano className="w-5 h-5" />
          Thư viện piano · miễn phí
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 tracking-tight leading-tight mt-3 max-w-3xl">
          Thư viện piano cho người mới bắt đầu
        </h1>
        <p className="text-ink-700 mt-4 max-w-3xl text-lg leading-relaxed">Năm phần đi từ đọc được nốt trên giấy, tới biết nó nằm ở phím nào, rồi ngân bao lâu, rồi ghép thành hợp âm để đệm hát — và mấy game để luyện cho thành phản xạ.</p>
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 [&>*]:min-w-0">
          {SECTION.topics.map((t) => (
            <Link
              key={t.path}
              href={t.path}
              className="group rounded-2xl border border-navy-100 bg-white hover:border-wood-300 p-5 transition flex flex-col"
            >
              <h2 className="font-bold text-ink-900 text-lg flex items-center gap-1.5">
                {t.name}
                <IconChevronRight className="w-4 h-4 text-ink-300 group-hover:text-wood-600 transition" />
              </h2>
              <p className="text-sm text-ink-600 mt-1.5 leading-relaxed flex-1">{t.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </LibraryShell>
  );
}
