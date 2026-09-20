import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * metadataBase để Next dựng link tuyệt đối cho ảnh xem trước — Zalo và
 * Facebook chỉ nhận URL đầy đủ, đường dẫn tương đối là mất ảnh.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Piano Guitar Đệm Hát — Học nhạc 1 kèm 1 online",
    template: "%s · Piano Guitar Đệm Hát",
  },
  description:
    "Trung tâm dạy Guitar, Piano, Violin, Saxophone, Thanh nhạc, Toán, Tiếng Việt, Tiếng Anh, Quảng cáo và Quay chụp dựng — học 1 kèm 1 online, giáo viên song ngữ Việt–Anh. Học thử 1 buổi miễn phí.",
  openGraph: {
    type: "website",
    siteName: "Piano Guitar Đệm Hát",
    locale: "vi_VN",
  },
  twitter: { card: "summary_large_image" },
  // Google xác minh bằng tệp trong public/, Bing thì nhận cả tệp lẫn thẻ này.
  // Khai cả hai để lần xác minh nào hỏng thì còn đường kia.
  verification: { other: { "msvalidate.01": "492642B0FA42F9A2FD0643DBD97707FD" } },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ivory-50 text-ink-900">{children}</body>
    </html>
  );
}
