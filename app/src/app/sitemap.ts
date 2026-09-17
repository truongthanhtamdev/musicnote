import type { MetadataRoute } from "next";
import { PUBLIC_PATHS, SITE_URL } from "@/lib/seo";

/**
 * Chỉ liệt kê trang công khai. Trang sau đăng nhập cố ý không có mặt ở đây.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_PATHS.map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: now,
    changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const),
    priority: path === "/" ? 1 : 0.8,
  }));
}
