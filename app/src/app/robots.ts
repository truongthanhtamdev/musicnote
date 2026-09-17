import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Cho máy tìm kiếm đọc trang giới thiệu và hai thư viện, chặn toàn bộ khu vực
 * đăng nhập. Trang quản trị và trang học viên có dữ liệu thật của khách —
 * không có lý do gì để chúng nằm trên Google.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/teacher", "/student", "/login", "/quen-mat-khau", "/danh-gia"],
    },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
