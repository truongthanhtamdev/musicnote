import type { Metadata } from "next";
import { PIANO_LIBRARY } from "@/lib/library";
import { LibraryShell, TopicHero } from "@/components/library-shell";
import { TopicFaq } from "@/components/topic-faq";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, learningResourceJsonLd } from "@/lib/seo";
import { IconPiano } from "@/components/icons";
import PianoChords from "../piano-chords";

const SECTION = PIANO_LIBRARY;
const TOPIC = SECTION.topics.find((t) => t.path === "/piano/hop-am")!;

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
    "q": "Hợp âm piano cơ bản gồm những hợp âm nào?",
    "a": "Với người mới nên bắt đầu từ bảy hợp âm của tông Đô: C, Dm, Em, F, G, Am và G7. Cả bảy đều chỉ dùng phím trắng nên không phải nhớ phím đen nào."
  },
  {
    "q": "Hợp âm Đô trưởng bấm những nốt nào?",
    "a": "Ba nốt Đô – Mi – Sol ở tay phải, và nốt Đô thấp hơn một quãng tám ở tay trái. Ba nốt cách nhau đều một quãng ba, đặt ngón 1, 3, 5."
  },
  {
    "q": "Tay trái chơi gì khi đệm hát piano?",
    "a": "Cách đơn giản nhất cho người mới là đánh nốt gốc của hợp âm, thấp hơn tay phải một quãng tám. Hợp âm C thì tay trái đánh nốt Đô, hợp âm F thì đánh nốt Fa. Quen rồi mới rải hoặc thêm quãng năm."
  },
  {
    "q": "Học hợp âm tông Đô rồi thì sang tông khác thế nào?",
    "a": "Giữ nguyên hình dạng bàn tay rồi dời sang phím khác — quãng cách giữa các ngón không đổi, chỉ có điểm bắt đầu đổi. Khác biệt duy nhất là tông khác sẽ có thêm phím đen."
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
        answer={<>Bảy hợp âm của tông Đô — <strong>C, Dm, Em, F, G, Am, G7</strong> — đều chỉ dùng
          phím trắng, nên người mới bấm được ngay buổi đầu. Tay phải bấm ba nốt, tay trái đánh nốt
          gốc thấp hơn một quãng tám. Nắm bảy hợp âm này là đệm hát được rất nhiều bài.</>}
      />

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-10">
        <p className="text-ink-600 max-w-3xl">
          Bấm tên hợp âm để thấy phím nào cần bấm và nghe tiếng. Phần dưới có bốn vòng đệm hát hay
          dùng — bấm từng hợp âm theo thứ tự là nghe ra ngay cái vòng mà bài hát đang chạy.
        </p>
        <div className="mt-6">
          <PianoChords />
        </div>
      </section>

      <TopicFaq items={FAQ} />
    </LibraryShell>
  );
}
