import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, ARTICLE_BY_SLUG } from "@/lib/articles";
import { ArticleBody } from "@/components/article-body";
import { LibraryShell } from "@/components/library-shell";
import { TopicFaq } from "@/components/topic-faq";
import { JsonLd } from "@/components/json-ld";
import { GUITAR_LIBRARY } from "@/lib/library";
import { SITE_NAME, SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import { IconChevronRight } from "@/components/icons";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = ARTICLE_BY_SLUG.get(slug);
  if (!a) return {};
  const url = `/hoc-nhac/${a.slug}`;
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: `${a.question} · ${SITE_NAME}`,
      description: a.description,
      url,
      modifiedTime: a.updated,
    },
  };
}

/**
 * Một bài tư vấn.
 *
 * Dùng chung khung với thư viện, nhưng phần dẫn sang chủ đề khác vẫn trỏ về
 * thư viện guitar — bài viết là cửa vào, thư viện mới là thứ giữ người đọc
 * lại trên trang.
 */
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = ARTICLE_BY_SLUG.get(slug);
  if (!a) notFound();

  const url = new URL(`/hoc-nhac/${a.slug}`, SITE_URL).toString();

  return (
    <LibraryShell section={GUITAR_LIBRARY}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          "@id": `${url}#article`,
          headline: a.question,
          description: a.description,
          url,
          inLanguage: "vi",
          dateModified: a.updated,
          author: { "@type": "Organization", name: SITE_NAME },
          publisher: { "@id": new URL("/#school", SITE_URL).toString() },
          mainEntityOfPage: url,
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Trang chủ", path: "/" },
          { name: "Góc tư vấn", path: "/hoc-nhac" },
          { name: a.title, path: `/hoc-nhac/${a.slug}` },
        ])}
      />

      <nav aria-label="Đường dẫn" className="max-w-6xl mx-auto w-full px-5 sm:px-8 pt-5 text-sm text-ink-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-ink-900">
              Trang chủ
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href="/hoc-nhac" className="hover:text-ink-900">
              Góc tư vấn
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="font-medium text-ink-800">{a.title}</li>
        </ol>
      </nav>

      <article className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 pb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 tracking-tight leading-tight max-w-3xl">
          {a.question}
        </h1>
        <p className="text-sm text-ink-400 mt-3">Cập nhật {a.updated}</p>

        {/* Câu trả lời thẳng, tách riêng ra vẫn đọc được — đây là đoạn hay bị
            trích nhất nên không để lẫn vào phần dẫn nhập. */}
        <p className="text-lg text-ink-800 leading-relaxed mt-5 max-w-3xl rounded-2xl bg-ivory-100 border border-navy-100 p-5">
          {a.answer}
        </p>

        <div className="mt-10">
          <ArticleBody blocks={a.blocks} />
        </div>

        {a.related && a.related.length > 0 && (
          <div className="mt-10 max-w-3xl">
            <h2 className="text-lg font-bold text-ink-900">Công cụ miễn phí liên quan</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              {a.related.map((r) => (
                <Link
                  key={r.path}
                  href={r.path}
                  className="inline-flex items-center gap-1 rounded-xl border border-navy-200 bg-white hover:border-wood-300 px-4 py-2 text-sm font-semibold text-ink-700 transition"
                >
                  {r.label}
                  <IconChevronRight className="w-4 h-4 text-ink-300" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <TopicFaq items={a.faq} />
    </LibraryShell>
  );
}
