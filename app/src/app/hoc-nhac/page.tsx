import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES } from "@/lib/articles";
import { LibraryShell } from "@/components/library-shell";
import { GUITAR_LIBRARY } from "@/lib/library";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo";
import { IconChevronRight } from "@/components/icons";

const TITLE = "Góc tư vấn học nhạc";
const DESC =
  "Trả lời những câu hay gặp nhất khi bắt đầu học nhạc: học online có hiệu quả không, học guitar bao lâu thì đệm hát được, bé mấy tuổi học đàn được.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/hoc-nhac" },
  openGraph: { title: `${TITLE} · Piano Guitar Đệm Hát`, description: DESC, url: "/hoc-nhac" },
};

export default function Page() {
  return (
    <LibraryShell section={GUITAR_LIBRARY}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Trang chủ", path: "/" },
          { name: "Góc tư vấn", path: "/hoc-nhac" },
        ])}
      />

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-8 sm:pt-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 tracking-tight leading-tight max-w-3xl">
          {TITLE}
        </h1>
        <p className="text-ink-700 mt-4 max-w-3xl text-lg leading-relaxed">
          Những câu người mới hay hỏi nhất, trả lời thẳng và đủ hai mặt — kể cả những chỗ mà câu
          trả lời trung thực không có lợi cho một trung tâm dạy nhạc.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
          {ARTICLES.map((a) => (
            <Link
              key={a.slug}
              href={`/hoc-nhac/${a.slug}`}
              className="group rounded-2xl border border-navy-100 bg-white hover:border-wood-300 p-5 transition flex flex-col"
            >
              <h2 className="font-bold text-ink-900 text-lg flex items-start gap-1.5">
                {a.question}
                <IconChevronRight className="w-4 h-4 text-ink-300 group-hover:text-wood-600 transition shrink-0 mt-1" />
              </h2>
              <p className="text-sm text-ink-600 mt-2 leading-relaxed flex-1">{a.answer}</p>
            </Link>
          ))}
        </div>
      </section>
    </LibraryShell>
  );
}
