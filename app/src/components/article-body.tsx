import Link from "next/link";
import type { ArticleBlock } from "@/lib/articles";

/**
 * Đổi `[chữ hiện](/đường-dẫn)` trong chuỗi thành liên kết.
 *
 * Cố ý chỉ nhận đúng cú pháp này và chỉ nhận đường dẫn nội bộ bắt đầu bằng
 * "/", để nội dung bài viết không chèn được HTML hay liên kết ra ngoài.
 */
function renderText(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <Link key={`${keyBase}-${i++}`} href={m[2]} className="text-wood-700 underline underline-offset-2 hover:text-wood-800">
        {m[1]}
      </Link>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="space-y-10">
      {blocks.map((b, bi) => (
        <section key={b.heading ?? bi}>
          {b.heading && (
            <h2 className="text-2xl font-bold text-ink-900 tracking-tight">{b.heading}</h2>
          )}

          {b.paragraphs?.map((t, i) => (
            <p key={i} className="text-ink-700 leading-relaxed mt-3 max-w-3xl">
              {renderText(t, `p${bi}-${i}`)}
            </p>
          ))}

          {b.list && (
            <ul className="mt-4 space-y-2.5 max-w-3xl">
              {b.list.map((t, i) => (
                <li key={i} className="flex gap-3 text-ink-700 leading-relaxed">
                  <span aria-hidden className="mt-2 w-1.5 h-1.5 rounded-full bg-wood-500 shrink-0" />
                  <span>{renderText(t, `l${bi}-${i}`)}</span>
                </li>
              ))}
            </ul>
          )}

          {b.steps && (
            <dl className="mt-4 space-y-3 max-w-3xl">
              {b.steps.map((s, i) => (
                <div key={i} className="rounded-xl border border-navy-100 bg-white p-4">
                  <dt className="font-semibold text-ink-900">{s.label}</dt>
                  <dd className="text-ink-700 leading-relaxed mt-1">
                    {renderText(s.text, `s${bi}-${i}`)}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {b.callout && (
            <p className="mt-5 max-w-3xl rounded-xl border-l-4 border-wood-500 bg-wood-50 px-4 py-3 text-ink-800 leading-relaxed font-medium">
              {renderText(b.callout, `c${bi}`)}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
