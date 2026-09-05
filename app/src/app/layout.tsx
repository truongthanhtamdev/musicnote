import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Một họ chữ duy nhất cho toàn hệ thống — dáng hình học, chữ số đều nhau,
// hợp với bảng biểu và các con số doanh thu.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ClientHub - Piano Guitar Đệm Hát",
  description:
    "Quản lý khách hàng tiềm năng, lớp học, điểm danh và doanh thu cho trung tâm dạy nhạc",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
