import type { Metadata } from "next";
import { GUITAR_LIBRARY } from "@/lib/library";
import { LibraryShell, TopicHero } from "@/components/library-shell";
import { TopicFaq } from "@/components/topic-faq";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, learningResourceJsonLd } from "@/lib/seo";
import { IconGuitar } from "@/components/icons";
import ChordLibrary from "../chord-library";

const SECTION = GUITAR_LIBRARY;
const TOPIC = SECTION.topics.find((t) => t.path === "/guitar/hop-am")!;

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
    "q": "Người mới nên học hợp âm guitar nào trước?",
    "a": "Bắt đầu với nhóm hợp âm trưởng và thứ dạng mở: Em, Am, C, G, D. Năm hợp âm này bấm dễ, không phải chặn, và đã đủ để đệm rất nhiều bài. Học thuộc thế bấm rồi mới tập đổi qua lại cho mượt."
  },
  {
    "q": "Bấm hợp âm bị rè là do đâu?",
    "a": "Thường không phải do yếu tay mà do bấm sai chỗ. Đầu ngón phải đặt sát ngay phía sau thanh ngăn, không bấm vào giữa ô — bấm đúng chỗ thì lực nhẹ hơn nhiều mà tiếng vẫn rõ. Cũng cần dựng ngón cho thẳng đứng để không chạm sang dây bên cạnh."
  },
  {
    "q": "Chưa chặn được hợp âm F thì làm sao?",
    "a": "Dùng tạm Fmaj7 chỉ bấm 4 dây mỏng để chơi hết bài, rồi mỗi ngày tập chặn F khoảng 5 phút. Vài tuần là chặn được — không cần khổ luyện dồn vào một hôm."
  },
  {
    "q": "Số trong hình thế bấm nghĩa là gì?",
    "a": "Là ngón tay dùng để bấm: 1 là ngón trỏ, 2 ngón giữa, 3 ngón áp út, 4 ngón út. Chữ o phía trên dây nghĩa là dây buông — vẫn đánh nhưng không bấm; chữ x nghĩa là dây đó không đánh."
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
        answer={<><strong>32 thế bấm</strong> chia theo năm nhóm: hợp âm trưởng nghe tươi, hợp âm
          thứ nghe buồn, hợp âm 7 tạo cảm giác lửng dẫn về hợp âm sau, hợp âm chặn mở ra mọi tông,
          và hợp âm màu để rải cho đỡ đơn điệu. Số trong chấm tròn là ngón tay —{" "}
          <strong>1 trỏ, 2 giữa, 3 áp út, 4 út</strong>. Dấu <strong>o</strong> là dây buông vẫn
          đánh, dấu <strong>x</strong> là dây không đánh.</>}
      />

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-10">
        <p className="text-ink-600 max-w-3xl">
          Bấm <span className="font-semibold text-ink-700">Nghe</span> để nghe hợp âm kêu thế nào,{" "}
          <span className="font-semibold text-ink-700">Rải</span> để nghe từng dây một — cách nhanh
          nhất để dò xem dây nào mình bấm chưa kêu.
        </p>
        <div className="mt-6">
          <ChordLibrary />
        </div>
      </section>

      <TopicFaq items={FAQ} />
    </LibraryShell>
  );
}
