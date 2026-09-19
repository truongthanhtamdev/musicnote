import type { Metadata } from "next";
import { GUITAR_LIBRARY } from "@/lib/library";
import { LibraryShell, TopicHero } from "@/components/library-shell";
import { TopicFaq } from "@/components/topic-faq";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, learningResourceJsonLd } from "@/lib/seo";
import { IconGuitar } from "@/components/icons";
import CapoTable from "../capo-table";

const SECTION = GUITAR_LIBRARY;
const TOPIC = SECTION.topics.find((t) => t.path === "/guitar/capo")!;

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
    "q": "Capo guitar là gì?",
    "a": "Là cái kẹp gắn ngang cần đàn, ép hết sáu dây xuống một ngăn nào đó. Ngăn bị kẹp trở thành dây buông mới, nên mọi thế bấm phía trên đều cao lên đúng bằng số ngăn đã kẹp."
  },
  {
    "q": "Kẹp capo ngăn 2 bấm thế C thì ra hợp âm gì?",
    "a": "Ra hợp âm D. Ngăn 2 tức là cao hơn hai nửa cung, mà C lên hai nửa cung là D. Tương tự bấm thế Am với capo ngăn 2 sẽ nghe ra Bm."
  },
  {
    "q": "Vì sao phải dùng capo thay vì bấm hợp âm chặn?",
    "a": "Để tay đỡ mỏi và tiếng sạch hơn. Bài ở tông nhiều dấu thăng giáng nếu bấm thẳng thì gần như hợp âm nào cũng phải chặn; kẹp capo rồi bấm thế mở thì vừa dễ vừa có tiếng dây buông ngân vang hơn."
  },
  {
    "q": "Capo kẹp được tối đa ngăn mấy?",
    "a": "Về lý thuyết kẹp đâu cũng được, nhưng thực tế hiếm khi kẹp quá ngăn 7 vì càng lên cao tiếng càng mỏng và cần đàn càng chật tay. Nếu phải kẹp cao hơn thì nên đổi sang thế bấm khác gần tông hơn."
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
        answer={<><strong>Capo là cái kẹp gắn ngang cần đàn, kẹp ở ngăn nào thì mọi thế bấm đều
          cao lên bấy nhiêu nửa cung.</strong>{" "}
          Nhờ vậy bài ở tông khó bấm vẫn chơi được bằng thế mở dễ: bài tông Mi giáng thì kẹp capo
          ngăn 1 rồi bấm thế Rê, nghe ra vẫn đúng tông Mi giáng.</>}
      />

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-10">
        <div className="mt-2">
          <CapoTable />
        </div>
      </section>

      <TopicFaq items={FAQ} />
    </LibraryShell>
  );
}
