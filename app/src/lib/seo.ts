/**
 * Địa chỉ site và dữ liệu có cấu trúc (JSON-LD) cho máy tìm kiếm và các công
 * cụ AI đọc.
 *
 * Người đọc trang thấy chữ, máy thì không — máy cần được nói thẳng "đây là
 * trung tâm dạy nhạc, đây là môn, đây là giá, dạy bằng tiếng Việt và tiếng
 * Anh". Không có khối này thì công cụ phải tự đoán từ chữ trên trang, mà đoán
 * thì lúc trúng lúc trật.
 */

import { PRICING } from "./types";

/** Một chỗ duy nhất định nghĩa địa chỉ site, để metadata/sitemap/robots không lệch nhau. */
export const SITE_URL = process.env.SITE_URL || "https://pianoguitardemhat.com";

export const SITE_NAME = "Piano Guitar Đệm Hát";

/** Trang công khai — chỉ những trang này mới cho lập chỉ mục và nằm trong sitemap. */
export const PUBLIC_PATHS = ["/", "/guitar", "/piano"] as const;

const abs = (path: string) => new URL(path, SITE_URL).toString();

export interface SubjectInfo {
  name: string;
  text: string;
}

/**
 * Trung tâm: dạy online nên cố ý KHÔNG khai địa chỉ đường phố. Khai địa chỉ
 * giả để "cho có" là cách nhanh nhất bị Google gỡ hồ sơ, và cũng làm công cụ
 * hiểu sai thành lớp học tại chỗ.
 */
export function schoolJsonLd(contact: { facebook?: string | null; zalo?: string | null }) {
  // sameAs chỉ nhận địa chỉ web. Zalo khai bằng số điện thoại trần là chuyện
  // thường, nên số thì cho vào telephone, link thì mới vào sameAs — nhét số
  // vào sameAs là khối dữ liệu bị coi là sai và bỏ qua cả cụm.
  const isUrl = (v: string) => /^https?:\/\//i.test(v);
  const links = [contact.facebook, contact.zalo].filter(
    (v): v is string => !!v && isUrl(v)
  );
  const phone = [contact.zalo].find((v): v is string => !!v && !isUrl(v));
  const sameAs = links;
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": abs("/#school"),
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Trung tâm dạy Guitar, Piano, Violin, Saxophone, Thanh nhạc và Toán, Tiếng Việt, Tiếng Anh theo hình thức 1 kèm 1 online, giáo viên song ngữ Việt–Anh. Buổi học thử đầu tiên miễn phí.",
    inLanguage: ["vi", "en"],
    availableLanguage: [
      { "@type": "Language", name: "Vietnamese", alternateName: "vi" },
      { "@type": "Language", name: "English", alternateName: "en" },
    ],
    ...(sameAs.length ? { sameAs } : {}),
    ...(phone ? { telephone: phone } : {}),
  };
}

/**
 * Mỗi bộ môn là một Course. Môn có trong bảng giá thì gắn luôn giá từng gói,
 * lấy thẳng từ PRICING nên không bao giờ lệch với bảng giá hiện trên trang.
 */
export function courseJsonLd(subjects: SubjectInfo[]) {
  return subjects.map((s) => {
    const tiers = PRICING.find((p) => p.subject === s.name)?.tiers ?? [];
    const offers = tiers
      .filter((t) => t.price != null)
      .map((t) => ({
        "@type": "Offer",
        name: `${t.name} — ${t.sessions} buổi`,
        price: String(t.price),
        priceCurrency: "VND",
        category: "Paid",
        availability: "https://schema.org/InStock",
      }));

    return {
      "@context": "https://schema.org",
      "@type": "Course",
      name: `Học ${s.name} 1 kèm 1 online`,
      description: s.text,
      inLanguage: ["vi", "en"],
      provider: { "@id": abs("/#school") },
      // Buổi đầu miễn phí là điểm khách hỏi nhiều nhất, khai riêng để công cụ
      // trích được mà không phải đọc hiểu câu chữ quảng cáo.
      offers: [
        {
          "@type": "Offer",
          name: "Buổi học thử",
          price: "0",
          priceCurrency: "VND",
          category: "Free",
          availability: "https://schema.org/InStock",
        },
        ...offers,
      ],
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "Online",
        courseWorkload: "PT60M",
        inLanguage: ["vi", "en"],
      },
    };
  });
}

/** Thư viện guitar/piano: khai là tài liệu học miễn phí, không phải trang bán hàng. */
export function learningResourceJsonLd(opts: {
  path: string;
  name: string;
  description: string;
  about: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": abs(`${opts.path}#resource`),
    url: abs(opts.path),
    name: opts.name,
    description: opts.description,
    about: opts.about,
    inLanguage: "vi",
    isAccessibleForFree: true,
    educationalLevel: "Beginner",
    learningResourceType: "Reference material",
    provider: { "@id": abs("/#school") },
  };
}
