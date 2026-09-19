import type { Metadata } from "next";
import { PIANO_LIBRARY } from "@/lib/library";
import { LibraryShell, TopicHero } from "@/components/library-shell";
import { TopicFaq } from "@/components/topic-faq";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, learningResourceJsonLd } from "@/lib/seo";
import { IconPiano } from "@/components/icons";
import PlayablePiano from "../playable-piano";

const SECTION = PIANO_LIBRARY;
const TOPIC = SECTION.topics.find((t) => t.path === "/piano/ban-phim")!;

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
    "q": "Làm sao tìm nốt Đô trên đàn piano?",
    "a": "Nhìn cụm 2 phím đen đi liền nhau. Phím trắng nằm ngay bên trái cụm 2 phím đen đó chính là nốt Đô. Cụm này lặp lại suốt cây đàn nên chỗ nào cũng tìm được Đô."
  },
  {
    "q": "Đô giữa là phím nào?",
    "a": "Là nốt Đô nằm gần chính giữa bàn phím, thường ngay dưới logo hãng đàn. Trên bản nhạc nó là nốt nối hai khuông: dòng kẻ phụ dưới khuông khóa Sol và dòng kẻ phụ trên khuông khóa Fa."
  },
  {
    "q": "Vì sao phím đen chia thành cụm 2 và cụm 3?",
    "a": "Vì trong bảy nốt Đô Rê Mi Fa Sol La Si, khoảng cách giữa Mi–Fa và Si–Đô chỉ bằng nửa cung nên không có phím đen chen vào. Chính hai chỗ trống đó chia phím đen thành cụm 2 và cụm 3, và đó là mốc để dò nốt."
  },
  {
    "q": "Đàn piano có bao nhiêu phím?",
    "a": "Đàn piano cơ tiêu chuẩn có 88 phím, gồm 52 phím trắng và 36 phím đen, trải hơn 7 quãng tám. Đàn điện cho người mới thường có 61 hoặc 76 phím, vẫn đủ để học những năm đầu."
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
        answer={<>Phím đen trên đàn đi thành <strong>cụm 2 rồi cụm 3</strong>, lặp lại suốt cây
          đàn. <strong>Phím trắng nằm ngay bên trái cụm 2 phím đen luôn là nốt Đô.</strong> Tìm
          được Đô rồi thì các nốt còn lại chỉ việc đếm sang phải: Đô Rê Mi Fa Sol La Si.</>}
      />

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-10">
        <p className="text-ink-600 max-w-3xl">
          Bấm thử bên dưới: mỗi phím phát ra tiếng piano thật và hiện luôn nốt đó nằm đâu trên
          khuông nhạc. Phím có vòng tròn là <span className="font-semibold text-ink-900">Đô giữa</span>{" "}
          — nốt nằm gần chính giữa đàn và là nốt nối hai khuông khóa Sol với khóa Fa.
        </p>
        <div className="mt-6">
          <PlayablePiano />
        </div>
      </section>

      <TopicFaq items={FAQ} />
    </LibraryShell>
  );
}
