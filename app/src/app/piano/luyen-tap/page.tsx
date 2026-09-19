import type { Metadata } from "next";
import { PIANO_LIBRARY } from "@/lib/library";
import { LibraryShell, TopicHero } from "@/components/library-shell";
import { TopicFaq } from "@/components/topic-faq";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, learningResourceJsonLd } from "@/lib/seo";
import { IconPiano } from "@/components/icons";
import { Metronome } from "@/components/metronome";
import NoteGame from "../note-game";
import EarTraining from "../ear-training";

const SECTION = PIANO_LIBRARY;
const TOPIC = SECTION.topics.find((t) => t.path === "/piano/luyen-tap")!;

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
    "q": "Luyện đọc nốt nhạc mỗi ngày bao lâu là đủ?",
    "a": "Khoảng 5 phút mỗi ngày. Đọc nốt là phản xạ nên tần suất quan trọng hơn thời lượng — 5 phút mỗi ngày hiệu quả hơn hẳn một tiếng dồn vào cuối tuần."
  },
  {
    "q": "Luyện tai âm nhạc bắt đầu từ đâu?",
    "a": "Bắt đầu từ việc phân biệt cao thấp: nghe hai nốt liên tiếp và nói nốt sau cao hơn hay thấp hơn nốt trước. Làm được đều rồi mới sang mức khó hơn là nghe một nốt mốc rồi đoán tên nốt kế tiếp."
  },
  {
    "q": "Máy đếm nhịp nên để bao nhiêu phách một phút?",
    "a": "Người mới nên bắt đầu ở 60–70 phách/phút, đủ chậm để kịp nghĩ. Chỉ tăng tốc khi đã chơi đúng và đều ở tốc độ hiện tại — tăng sớm chỉ tập thành quen tay sai."
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
        answer={<>Hai game và một máy đếm nhịp, chơi được ngay không cần đăng nhập.{" "}
          <strong>Game đọc nốt</strong> luyện mắt: hiện một nốt, bạn bấm tên.{" "}
          <strong>Game luyện tai</strong> luyện tai: nghe hai nốt rồi đoán cao thấp, hoặc nghe Đô
          rồi đoán tên nốt kế tiếp. Mỗi lượt 20 câu, kỷ lục lưu trong máy bạn.</>}
      />

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-10">
        <h2 className="text-2xl font-bold text-ink-900 tracking-tight">Game đọc nốt</h2>
        <p className="text-ink-600 mt-2 max-w-3xl">
          Chọn khóa Sol, khóa Fa, hoặc cả hai cho khó. Trả lời sai thì game hiện luôn phím đàn
          tương ứng — sai là lúc nhớ lâu nhất.
        </p>
        <div className="mt-5">
          <NoteGame />
        </div>

        <h2 className="text-2xl font-bold text-ink-900 tracking-tight mt-12">Game luyện tai</h2>
        <p className="text-ink-600 mt-2 max-w-3xl">
          Mắt đọc được nốt rồi thì tới tai. Nhớ bật loa lên — game này không nhìn được gì cả.
        </p>
        <div className="mt-5">
          <EarTraining />
        </div>

        <div className="mt-8">
          <Metronome />
        </div>
      </section>

      <TopicFaq items={FAQ} />
    </LibraryShell>
  );
}
