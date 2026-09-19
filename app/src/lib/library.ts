/**
 * Danh mục các trang thư viện.
 *
 * Tách mỗi chủ đề thành một địa chỉ riêng thay vì nhồi hết vào /guitar và
 * /piano: Google xếp hạng theo từng URL, nên một trang gánh năm chủ đề thì
 * không thắng nổi chủ đề nào. Tách ra là từ 2 cửa thành 12 cửa đón khách.
 *
 * Một chỗ khai duy nhất, dùng chung cho thẻ ở trang tổng, sitemap và dấu vết
 * đường dẫn — thêm trang mới chỉ sửa ở đây.
 */

export interface LibraryTopic {
  path: string;
  /** Tên ngắn hiện trên thẻ và trên dấu vết đường dẫn. */
  name: string;
  /** Tiêu đề trang, cũng là tiêu đề trên Google. */
  title: string;
  description: string;
  /** Một câu tóm tắt cho thẻ ở trang tổng. */
  blurb: string;
  /** Từ khoá trang này nhắm tới — ghi lại để sau còn biết vì sao trang tồn tại. */
  keywords: string[];
}

export interface LibrarySection {
  /** Trang tổng của nhóm. */
  root: string;
  rootName: string;
  topics: LibraryTopic[];
}

export const GUITAR_LIBRARY: LibrarySection = {
  root: "/guitar",
  rootName: "Thư viện guitar",
  topics: [
    {
      path: "/guitar/hop-am",
      name: "Thế bấm hợp âm",
      title: "Hợp âm guitar cơ bản — 32 thế bấm",
      description:
        "Tra thế bấm 32 hợp âm guitar cho người mới: trưởng, thứ, hợp âm 7, hợp âm chặn và hợp âm màu. Có số ngón tay, nghe được tiếng, kèm mẹo bấm. Miễn phí.",
      blurb: "32 thế bấm, chia theo nhóm, có số ngón và nghe được tiếng.",
      keywords: ["hợp âm guitar cơ bản", "thế bấm hợp âm guitar", "hợp âm guitar cho người mới"],
    },
    {
      path: "/guitar/vong-hoa-thanh",
      name: "Vòng hòa thanh",
      title: "Vòng hòa thanh guitar cho người mới",
      description:
        "Vòng hòa thanh là gì và vì sao nhớ vòng thì đệm được bài lạ. 9 vòng thông dụng — 1-5-6-4, Canon, 2-5-1 — ra ngay hợp âm theo 10 tông.",
      blurb: "9 vòng hay gặp nhất, chọn tông là ra ngay bộ hợp âm.",
      keywords: ["vòng hòa thanh là gì", "vòng hợp âm guitar", "vòng 1 5 6 4"],
    },
    {
      path: "/guitar/dieu-dem",
      name: "Điệu đệm",
      title: "Điệu đệm guitar — 8 điệu quạt, rải",
      description:
        "Ballad, Valse, Slow Rock, Bolero, Disco — 8 điệu đệm guitar vẽ thành lưới nhìn là đếm được, đủ cả quạt lẫn rải. Kèm mẹo tay phải cho từng điệu.",
      blurb: "8 điệu quạt và rải, vẽ thành lưới nhìn là đếm được nhịp.",
      keywords: ["điệu ballad guitar", "cách quạt chả guitar", "điệu bolero guitar", "điệu slow rock"],
    },
    {
      path: "/guitar/capo",
      name: "Bảng capo",
      title: "Capo guitar là gì, kẹp ngăn mấy",
      description:
        "Capo kẹp ngăn nào thì thế bấm ra tông gì, và muốn ra một tông thì kẹp ngăn mấy. Bảng tra đầy đủ từ ngăn 1 tới ngăn 7 cho 8 thế bấm mở dễ.",
      blurb: "Kẹp ngăn mấy để bấm thế dễ mà vẫn đúng tông bài hát.",
      keywords: ["capo là gì", "cách dùng capo guitar", "bảng capo"],
    },
    {
      path: "/guitar/luyen-tap",
      name: "Game & luyện tập",
      title: "Game hợp âm & luyện đổi hợp âm",
      description:
        "Ba công cụ luyện guitar miễn phí: game nhìn thế bấm đoán tên hợp âm, bài tập đổi hợp âm 60 giây có tiếng nhịp, và máy đếm nhịp 40–208 phách/phút.",
      blurb: "Game đoán hợp âm, bài tập đổi hợp âm 60 giây, máy đếm nhịp.",
      keywords: ["game hợp âm guitar", "bài tập đổi hợp âm", "máy đếm nhịp online"],
    },
  ],
};

export const PIANO_LIBRARY: LibrarySection = {
  root: "/piano",
  rootName: "Thư viện piano",
  topics: [
    {
      path: "/piano/doc-not-nhac",
      name: "Đọc nốt trên khuông",
      title: "Cách đọc nốt nhạc khóa Sol, khóa Fa",
      description:
        "Khóa Sol chỉ vào dòng kẻ thứ 2, khóa Fa chỉ vào dòng thứ 4 — nhớ một nốt neo rồi đếm ra là đọc được cả khuông. Kèm hai chuỗi nốt cần thuộc và 10 mẹo nhớ.",
      blurb: "Nốt neo, hai chuỗi dòng và khe, 10 mẹo nhớ cho người mới.",
      keywords: ["cách đọc nốt nhạc", "nốt nhạc khóa sol", "khóa fa", "mẹo nhớ nốt nhạc"],
    },
    {
      path: "/piano/ban-phim",
      name: "Nốt nằm ở phím nào",
      title: "Nốt nhạc nằm ở phím nào trên piano",
      description:
        "Phím trắng ngay bên trái cụm 2 phím đen luôn là nốt Đô. Bàn phím bấm được: bấm phím là nghe tiếng piano thật và thấy nốt đó hiện lên khuông nhạc.",
      blurb: "Bấm phím là nghe tiếng và thấy nốt hiện lên khuông nhạc.",
      keywords: ["nốt nhạc trên đàn piano", "vị trí nốt đô", "phím đàn piano"],
    },
    {
      path: "/piano/truong-do",
      name: "Trường độ nốt",
      title: "Trường độ nốt — nốt ngân bao lâu",
      description:
        "Nốt tròn 4 phách, trắng 2, đen 1, móc đơn nửa phách, móc kép một phần tư — mỗi bậc bằng nửa bậc trước. Kèm cách nhìn hình nốt là đoán ngay dài hay ngắn.",
      blurb: "5 hình nốt, từ tròn tới móc kép, kèm thanh đo phách.",
      keywords: ["trường độ nốt nhạc", "nốt tròn nốt trắng nốt đen", "nốt móc đơn"],
    },
    {
      path: "/piano/hop-am",
      name: "Hợp âm piano",
      title: "Hợp âm piano cơ bản tông Đô",
      description:
        "C, Dm, Em, F, G, Am, G7 — bảy hợp âm tông Đô toàn phím trắng, buổi đầu bấm được ngay. Bấm là thấy phím và nghe tiếng, kèm 4 vòng đệm hát.",
      blurb: "7 hợp âm toàn phím trắng, bấm là thấy phím và nghe tiếng.",
      keywords: ["hợp âm piano cơ bản", "đệm hát piano", "hợp âm tông đô"],
    },
    {
      path: "/piano/luyen-tap",
      name: "Game & luyện tai",
      title: "Game đọc nốt nhạc & luyện tai",
      description:
        "Game đọc nốt 20 câu cho khóa Sol, khóa Fa hoặc cả hai; game luyện tai nghe hai nốt đoán cao thấp rồi đoán tên nốt. Có máy đếm nhịp. Không cần đăng nhập.",
      blurb: "Game đọc nốt, game luyện tai hai mức, máy đếm nhịp.",
      keywords: ["game đọc nốt nhạc", "luyện tai âm nhạc", "test nốt nhạc"],
    },
  ],
};

export const LIBRARY_SECTIONS = [GUITAR_LIBRARY, PIANO_LIBRARY];

/** Mọi địa chỉ công khai của thư viện, cho sitemap. */
export const LIBRARY_PATHS = LIBRARY_SECTIONS.flatMap((s) => [
  s.root,
  ...s.topics.map((t) => t.path),
]);

export function findTopic(path: string): { section: LibrarySection; topic: LibraryTopic } | null {
  for (const section of LIBRARY_SECTIONS) {
    const topic = section.topics.find((t) => t.path === path);
    if (topic) return { section, topic };
  }
  return null;
}
