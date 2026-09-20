import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/seo";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";
import { AnalyticsPageView } from "@/components/analytics";

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
      <body className="min-h-full flex flex-col bg-ivory-50 text-ink-900">
        {children}
        {GA_MEASUREMENT_ID && (
          <>
            {/* Thẻ nội tuyến chạy ngay lúc trình duyệt đọc HTML, nên window.gtag
                đã sẵn sàng trước khi React chạy — không có lượt xem nào bị rơi
                vì gọi sớm hơn lúc thư viện GA tải xong. */}
            <script
              id="ga-init"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:false});`,
              }}
            />
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <AnalyticsPageView />
          </>
        )}
      </body>
    </html>
  );
}
