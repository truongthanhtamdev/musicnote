import type { Metadata } from "next";
import Link from "next/link";
import { GUITAR_LIBRARY } from "@/lib/library";
import { LibraryShell } from "@/components/library-shell";
import { JsonLd } from "@/components/json-ld";
import { learningResourceJsonLd } from "@/lib/seo";
import { IconGuitar, IconChevronRight } from "@/components/icons";

const SECTION = GUITAR_LIBRARY;

const TITLE = "Thư viện guitar miễn phí";
const DESC = "32 thế bấm hợp âm, 9 vòng hòa thanh đổi được 10 tông, 8 điệu đệm có lưới đếm nhịp, bảng capo và game luyện tập. Miễn phí, không cần đăng nhập, mở trên điện thoại được.";

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
          about: "Guitar",
        })}
      />

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-8 sm:pt-16">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-wood-600">
          <IconGuitar className="w-5 h-5" />
          Thư viện guitar · miễn phí
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 tracking-tight leading-tight mt-3 max-w-3xl">
          Thư viện guitar cho người mới tập đệm hát
        </h1>
        <p className="text-ink-700 mt-4 max-w-3xl text-lg leading-relaxed">Năm phần, học theo thứ tự nào cũng được: thế bấm hợp âm, vòng hòa thanh, điệu đệm cho tay phải, bảng capo, và mấy game luyện mỗi ngày vài phút. Không cần đăng nhập, mở trên điện thoại lúc đang ôm đàn cũng được.</p>
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
