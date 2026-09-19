import type { Metadata } from "next";
import { GUITAR_LIBRARY } from "@/lib/library";
import { LibraryShell, TopicHero } from "@/components/library-shell";
import { TopicFaq } from "@/components/topic-faq";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, learningResourceJsonLd } from "@/lib/seo";
import { IconGuitar } from "@/components/icons";
import { STRUM_PATTERNS } from "@/lib/strum";
import { StrumGrid, StrumLegend } from "@/components/strum-grid";

const SECTION = GUITAR_LIBRARY;
const TOPIC = SECTION.topics.find((t) => t.path === "/guitar/dieu-dem")!;

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
    "q": "Người mới nên tập điệu guitar nào trước?",
    "a": "Tập Ballad cơ bản trước: một nhát bass rồi ba nhát quạt xuống đều đặn, nhịp 4/4. Chỉ cần giữ tay phải đều là đã đệm theo bài được. Quen rồi mới sang Ballad đầy đủ có thêm nhát quạt lên."
  },
  {
    "q": "Điệu Ballad guitar đánh thế nào?",
    "a": "Nhịp 4/4, chia một ô nhịp thành 8 ô đều. Bản đầy đủ đánh: bass ở phách 1, quạt xuống ở phách 2, quạt lên ngay sau đó, quạt lên ở nửa sau phách 3, rồi quạt xuống và quạt lên ở phách 4. Tay phải cứ đưa lên xuống đều không ngừng, ô nào nghỉ thì vung tay qua chứ đừng dừng lại."
  },
  {
    "q": "Làm sao biết bài dùng nhịp 3 hay nhịp 4?",
    "a": "Vừa hát vừa đếm. Nếu đếm tới 3 là quay vòng thì dùng điệu nhịp 3 như Valse; đếm tới 4 mới quay vòng thì dùng Ballad hoặc các điệu nhịp 4/4."
  },
  {
    "q": "Quạt và rải khác nhau chỗ nào?",
    "a": "Quạt là gạt cả chùm dây cùng lúc bằng móng hoặc miếng gảy, nghe dày và khoẻ, hợp bài nhanh và hát tập thể. Rải là khảy từng dây riêng bằng các ngón, nghe trong và nhẹ, hợp bài chậm và đoạn mở đầu."
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
        answer={<>Biết hợp âm mới xong một nửa — nửa còn lại là tay phải.{" "}
          <strong>Quạt</strong> là gạt cả chùm dây cùng lúc, nghe dày và khoẻ, hợp bài nhanh.{" "}
          <strong>Rải</strong> là khảy từng dây một, nghe trong và nhẹ, hợp bài chậm. Cùng một bài
          có thể rải đoạn đầu rồi quạt khi vào điệp khúc.</>}
      />

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-10">
        <p className="text-ink-600 max-w-3xl">
          Mỗi cột trong lưới là một khoảng thời gian bằng nhau — đọc từ trái sang phải, đếm đều
          theo số ghi ở trên. Ô trống là nghỉ: tay vẫn vung qua nhưng không chạm dây.
        </p>
        <div className="rounded-2xl border border-navy-100 bg-white p-4 sm:p-5 mt-5">
          <StrumLegend />
        </div>

        <div className="grid grid-cols-1 [&>*]:min-w-0 lg:grid-cols-2 gap-5 mt-5">
          {STRUM_PATTERNS.map((pat) => (
            <div key={pat.id} className="rounded-2xl border border-navy-100 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-ink-900 text-lg">{pat.name}</h2>
                <span className="rounded-full bg-ivory-100 text-ink-600 px-2.5 py-0.5 text-xs font-semibold">
                  {pat.hand}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    pat.level === "Dễ"
                      ? "bg-mint-50 text-mint-700"
                      : pat.level === "Vừa"
                        ? "bg-wood-50 text-wood-700"
                        : "bg-coral-50 text-coral-700"
                  }`}
                >
                  {pat.level}
                </span>
              </div>
              <p className="text-sm text-ink-500 mt-1">
                Nhịp {pat.meter} · khoảng {pat.tempo} phách/phút
              </p>
              <div className="mt-4">
                <StrumGrid pattern={pat} />
              </div>
              <p className="text-sm text-ink-600 mt-4 leading-relaxed">{pat.description}</p>
              <p className="text-sm text-ink-500 mt-2">
                <span className="font-semibold text-ink-700">Hay dùng cho:</span> {pat.songs}
              </p>
              <p className="text-sm text-wood-700 mt-3 leading-relaxed border-t border-navy-100 pt-3">
                <span className="font-semibold">Mẹo:</span> {pat.tip}
              </p>
            </div>
          ))}
        </div>

        <p className="text-sm text-ink-500 mt-6 max-w-3xl leading-relaxed">
          Điệu nào cũng có nhiều biến thể tuỳ người dạy và tuỳ bài. Đây là bản phổ biến nhất, đủ để
          đệm được bài thật — tập chắc rồi thì tự biến tấu thêm.
        </p>
      </section>

      <TopicFaq items={FAQ} />
    </LibraryShell>
  );
}
