import { JsonLd } from "@/components/json-ld";
import { faqJsonLd } from "@/lib/seo";

/**
 * Khối hỏi–đáp: vừa hiện cho người đọc, vừa khai dữ liệu có cấu trúc cho máy.
 *
 * Phải hiện thật trên trang chứ không khai suông — khai dữ liệu mà trang
 * không có nội dung tương ứng là cách nhanh nhất bị Google phạt.
 */
export function TopicFaq({ items }: { items: { q: string; a: string }[] }) {
  if (items.length === 0) return null;
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
      <JsonLd data={faqJsonLd(items)} />
      <h2 className="text-2xl font-bold text-ink-900 tracking-tight">Câu hỏi thường gặp</h2>
      <dl className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5 [&>*]:min-w-0">
        {items.map((i) => (
          <div key={i.q} className="rounded-2xl border border-navy-100 bg-white p-5">
            <dt className="font-semibold text-ink-900">{i.q}</dt>
            <dd className="text-sm text-ink-600 mt-1.5 leading-relaxed">{i.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
