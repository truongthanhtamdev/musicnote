import type { Metadata } from "next";
import { GUITAR_LIBRARY } from "@/lib/library";
import { LibraryShell, TopicHero } from "@/components/library-shell";
import { TopicFaq } from "@/components/topic-faq";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, learningResourceJsonLd } from "@/lib/seo";
import { IconGuitar } from "@/components/icons";
import ProgressionExplorer from "../progression-explorer";

const SECTION = GUITAR_LIBRARY;
const TOPIC = SECTION.topics.find((t) => t.path === "/guitar/vong-hoa-thanh")!;

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
    "q": "Vòng hòa thanh là gì?",
    "a": "Là chuỗi hợp âm lặp lại làm nền cho bài hát. Người ta ghi vòng theo số bậc của tông — ví dụ vòng 1-5-6-4 — để đổi tông là ra ngay bộ hợp âm mới mà không phải nhớ lại từ đầu."
  },
  {
    "q": "Vòng hòa thanh nào phổ biến nhất?",
    "a": "Vòng 1-5-6-4 là vòng bốn hợp âm nổi tiếng nhất, hàng trăm bài nhạc trẻ dùng đúng vòng này. Ở tông Đô nó là C–G–Am–F. Đảo thứ tự thành 6-4-1-5 thì cùng bốn hợp âm đó nhưng nghe da diết hơn hẳn."
  },
  {
    "q": "Vì sao nên học theo vòng thay vì học từng bài?",
    "a": "Vì học một vòng là đệm được rất nhiều bài cùng lúc. Nắm chắc 1-5-6-4 và 1-6-4-5 thì nghe một bài lạ cũng đoán ra được hợp âm, không cần đi tìm bản hợp âm của riêng bài đó."
  },
  {
    "q": "Một tông có bao nhiêu hợp âm?",
    "a": "Bảy hợp âm, tương ứng bảy bậc của tông. Trong tông trưởng thì bậc 1, 4, 5 là hợp âm trưởng; bậc 2, 3, 6 là hợp âm thứ; bậc 7 là hợp âm giảm và rất ít dùng khi đệm hát."
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
        answer={<><strong>Vòng hòa thanh là một chuỗi hợp âm lặp đi lặp lại trong bài hát.</strong>{" "}
          Hợp âm trong một bài không đi lung tung mà chạy theo vài đường quen thuộc — nhớ được vòng
          thì đệm được cả bài chưa từng nghe, chỉ cần nghe ra bài đang chạy vòng nào.</>}
      />

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-10">
        <p className="text-ink-600 max-w-3xl">
          Vòng ghi theo <span className="font-semibold text-ink-700">số bậc</span> chứ không theo
          tên hợp âm — vòng 1-5-6-4 ở tông Đô là C–G–Am–F, ở tông Sol là G–D–Em–C. Chọn tông bên
          dưới là ra ngay bộ hợp âm của tông đó.
        </p>
        <div className="mt-6">
          <ProgressionExplorer />
        </div>
      </section>

      <TopicFaq items={FAQ} />
    </LibraryShell>
  );
}
