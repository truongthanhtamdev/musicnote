import type { Metadata } from "next";
import { PIANO_LIBRARY } from "@/lib/library";
import { LibraryShell, TopicHero } from "@/components/library-shell";
import { TopicFaq } from "@/components/topic-faq";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, learningResourceJsonLd } from "@/lib/seo";
import { IconMusic, IconPiano } from "@/components/icons";
import { CLEFS, MEMORY_TIPS } from "@/lib/piano";
import { MusicStaff } from "@/components/music-staff";

const SECTION = PIANO_LIBRARY;
const TOPIC = SECTION.topics.find((t) => t.path === "/piano/doc-not-nhac")!;

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
    "q": "Khóa Sol chỉ vào nốt nào?",
    "a": "Dòng kẻ thứ 2 tính từ dưới lên — dòng đó là nốt Sol. Đó cũng là lý do nó tên là khóa Sol. Từ nốt neo này đếm lên hoặc xuống là ra mọi nốt khác trên khuông."
  },
  {
    "q": "Khóa Fa đọc thế nào?",
    "a": "Khóa Fa có hai chấm kẹp dòng kẻ thứ 4, nên dòng đó là nốt Fa. Năm dòng kẻ khóa Fa từ dưới lên là Sol – Si – Rê – Fa – La, bốn khe là La – Đô – Mi – Sol."
  },
  {
    "q": "Năm dòng kẻ khóa Sol là những nốt nào?",
    "a": "Từ dưới lên: Mi – Sol – Si – Rê – Fa. Bốn khe giữa các dòng, cũng từ dưới lên, là Fa – La – Đô – Mi. Đọc to hai chuỗi này mỗi ngày vài lần thì chỉ vài hôm là bật ra tự động."
  },
  {
    "q": "Nốt Đô giữa nằm ở đâu trên khuông nhạc?",
    "a": "Đô giữa nằm trên dòng kẻ phụ ngay DƯỚI khuông khóa Sol, và cũng nằm trên dòng kẻ phụ ngay TRÊN khuông khóa Fa. Cùng một nốt, hiện ở cả hai khuông — nó là cây cầu nối hai khuông lại."
  },
  {
    "q": "Học đọc nốt nhạc mất bao lâu?",
    "a": "Đọc nốt là phản xạ chứ không phải kiến thức, nên quan trọng là tần suất chứ không phải thời lượng. Luyện 5 phút mỗi ngày hiệu quả hơn hẳn 1 tiếng mỗi tuần."
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
        answer={<><strong>Tên khóa nhạc chính là nốt mà nó chỉ vào.</strong> Khóa Sol xoắn vòng
          quanh dòng kẻ thứ 2, nên dòng đó là nốt Sol. Khóa Fa có hai chấm kẹp dòng kẻ thứ 4, nên
          dòng đó là nốt Fa. Nhớ đúng một nốt neo này rồi đếm lên đếm xuống là ra mọi nốt còn lại —
          nhanh và bền hơn học vẹt từng nốt một.</>}
      />

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-10">
        <p className="text-ink-600 max-w-3xl">
          Khuông nhạc có 5 dòng kẻ và 4 khe. Dấu màu nâu trên mỗi khuông dưới đây là chỗ khóa nhạc
          chỉ vào — đó là nốt neo để bạn đếm ra các nốt còn lại.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
          {(["sol", "fa"] as const).map((name) => {
            const clef = CLEFS[name];
            return (
              <div key={name} className="rounded-2xl border border-navy-100 bg-white p-5">
                <h2 className="font-bold text-ink-900 text-lg">{clef.fullLabel}</h2>
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

        <h2 className="text-2xl font-bold text-ink-900 tracking-tight mt-12">Mẹo nhớ nốt</h2>
        <div className="grid grid-cols-1 [&>*]:min-w-0 sm:grid-cols-2 gap-4 mt-5">
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

      <TopicFaq items={FAQ} />
    </LibraryShell>
  );
}
