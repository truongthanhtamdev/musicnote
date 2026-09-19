import type { Metadata } from "next";
import { PIANO_LIBRARY } from "@/lib/library";
import { LibraryShell, TopicHero } from "@/components/library-shell";
import { TopicFaq } from "@/components/topic-faq";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, learningResourceJsonLd } from "@/lib/seo";
import { IconMusic, IconPiano } from "@/components/icons";
import { NOTE_VALUES, RHYTHM_TIPS } from "@/lib/piano";
import { BeatBar, NoteValueGlyph } from "@/components/note-value";

const SECTION = PIANO_LIBRARY;
const TOPIC = SECTION.topics.find((t) => t.path === "/piano/truong-do")!;

export const metadata: Metadata = {
  title: TOPIC.title,
  description: TOPIC.description,
  alternates: { canonical: TOPIC.path },
  openGraph: {
    title: `${TOPIC.title} · Piano Guitar Đệm Hát`,
    description: TOPIC.description,
    url: TOPIC.path,
  },
};

const FAQ = [
  {
    "q": "Nốt tròn ngân mấy phách?",
    "a": "Bốn phách trong nhịp 4/4, tức trọn một ô nhịp. Nốt tròn có đầu rỗng và không có đuôi — đó là hình nốt duy nhất không có đuôi."
  },
  {
    "q": "Nốt đen ngân bao lâu?",
    "a": "Một phách. Nốt đen là đơn vị đếm quen thuộc nhất và cũng là hình nốt gặp nhiều nhất trên bản nhạc: đầu tô đặc, có đuôi trơn không móc."
  },
  {
    "q": "Làm sao nhìn hình nốt biết nó dài hay ngắn?",
    "a": "Nhìn hai chỗ. Đầu nốt rỗng ruột là nốt dài (tròn 4 phách, trắng 2 phách); đầu tô đặc là từ một phách trở xuống. Sau đó đếm móc ở đuôi: không móc là nốt đen, một móc là móc đơn nửa phách, hai móc là móc kép một phần tư phách."
  },
  {
    "q": "Vì sao phải đếm thành tiếng khi tập?",
    "a": "Vì đếm thầm rất dễ trôi nhịp mà không tự biết. Đếm to 1-2-3-4, nốt nửa phách thì đếm một-và hai-và — nghe thấy giọng mình đều thì tay sẽ đều theo."
  }
];

export default function Page() {
  return (
    <LibraryShell section={SECTION} topic={TOPIC}>
      <JsonLd
        data={learningResourceJsonLd({
          path: TOPIC.path,
          name: TOPIC.title,
          description: TOPIC.description,
          about: SECTION.root === "/guitar" ? "Guitar" : "Piano",
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Trang chủ", path: "/" },
          { name: SECTION.rootName, path: SECTION.root },
          { name: TOPIC.name, path: TOPIC.path },
        ])}
      />

      <TopicHero
        eyebrow={<><IconPiano className="w-5 h-5" />
            Thư viện piano · miễn phí</>}
        title={TOPIC.title}
        answer={<>Đọc bản nhạc là biết <strong>nốt gì</strong> cộng <strong>ngân bao lâu</strong>.
          Trong nhịp 4/4: nốt tròn 4 phách, nốt trắng 2, nốt đen 1, móc đơn nửa phách, móc kép một
          phần tư. <strong>Mỗi bậc đúng bằng một nửa bậc trước</strong> — không cần thuộc lòng năm
          con số, chỉ cần nhớ quy tắc chia đôi.</>}
      />

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-10">
        <div className="grid grid-cols-1 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {NOTE_VALUES.map((v) => (
            <div key={v.id} className="rounded-2xl border border-navy-100 bg-white p-5">
              <div className="flex items-center gap-3">
                <NoteValueGlyph value={v} />
                <div className="min-w-0">
                  <h2 className="font-bold text-ink-900">{v.name}</h2>
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
      </section>

      <TopicFaq items={FAQ} />
    </LibraryShell>
  );
}
