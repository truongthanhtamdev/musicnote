import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  metadataBase: new URL(process.env.SITE_URL || "https://pianoguitardemhat.com"),
  title: {
    default: "Piano Guitar Đệm Hát — Học nhạc 1 kèm 1 online",
    template: "%s · Piano Guitar Đệm Hát",
  },
  description:
    "Trung tâm dạy Guitar, Piano, Violin, Saxophone, Thanh nhạc và Toán, Tiếng Việt, Tiếng Anh — học 1 kèm 1 online, giáo viên song ngữ Việt–Anh. Học thử 1 buổi miễn phí.",
  openGraph: {
    type: "website",
    siteName: "Piano Guitar Đệm Hát",
    locale: "vi_VN",
  },
  twitter: { card: "summary_large_image" },
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
