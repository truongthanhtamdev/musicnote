import type { Metadata } from "next";
import { GUITAR_LIBRARY } from "@/lib/library";
import { LibraryShell, TopicHero } from "@/components/library-shell";
import { TopicFaq } from "@/components/topic-faq";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, learningResourceJsonLd } from "@/lib/seo";
import { IconGuitar } from "@/components/icons";
import { Metronome } from "@/components/metronome";
import ChordQuiz from "../chord-quiz";
import ChordSwitchDrill from "../chord-switch-drill";

const SECTION = GUITAR_LIBRARY;
const TOPIC = SECTION.topics.find((t) => t.path === "/guitar/luyen-tap")!;

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
    "q": "Một phút nên đổi được bao nhiêu lần hợp âm?",
    "a": "Mốc nên nhắm là 60 lần trong một phút cho một cặp hợp âm. Đạt tới đó thì việc đổi hợp âm đã thành phản xạ và ghép vào bài được. Người mới thường bắt đầu ở khoảng 15–25 lần, tăng dần sau vài tuần."
  },
  {
    "q": "Cặp hợp âm nào nên tập đổi trước?",
    "a": "C và G trước, rồi G và D. Đây là hai cặp xuất hiện nhiều nhất trong các vòng hòa thanh thông dụng, mà cũng là hai chỗ người mới hay vấp nhất vì phải dời cả bàn tay."
  },
  {
    "q": "Vì sao phải tập với máy đếm nhịp?",
    "a": "Vì tay người có xu hướng nhanh dần ở đoạn dễ và chậm lại ở đoạn khó mà tự mình không nhận ra. Máy đếm nhịp làm mốc cố định để phát hiện chỗ mình trôi nhịp — tập chậm mà đều luôn tốt hơn tập nhanh mà vấp."
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
        eyebrow={<><IconGuitar className="w-5 h-5" />
            Thư viện guitar · miễn phí</>}
        title={TOPIC.title}
        answer={<>Ba công cụ, mỗi thứ <strong>1–3 phút mỗi ngày</strong>: game nhìn thế bấm đoán
          tên hợp âm, bài tập đổi hợp âm 60 giây có tiếng nhịp, và máy đếm nhịp. Kỷ lục lưu ngay
          trong máy bạn — hôm sau vào chơi tiếp thấy số tăng là biết mình tiến bộ.</>}
      />

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 [&>*]:min-w-0">
          <ChordQuiz />
          <ChordSwitchDrill />
        </div>
        <div className="mt-5">
          <Metronome />
        </div>
      </section>

      <TopicFaq items={FAQ} />
    </LibraryShell>
  );
}
