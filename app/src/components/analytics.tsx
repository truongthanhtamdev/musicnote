"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isPublicPath, trackEvent } from "@/lib/analytics";

/**
 * Bắn lượt xem trang cho GA4.
 *
 * Phải tự bắn tay vì Next chuyển trang bằng JavaScript, không tải lại trang —
 * gtag chỉ tự đếm đúng lần đầu vào web, các lần bấm sang trang khác sau đó là
 * mất. Ở thẻ khởi tạo trong layout đã tắt send_page_view, nên mọi lượt xem
 * đều đi qua đây, kể cả lượt đầu tiên; nhờ vậy không có lượt nào bị đếm hai lần.
 */
export function AnalyticsPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isPublicPath(pathname)) return;
    trackEvent("page_view", {
      // page_location giữ nguyên cả ?utm_source=... nên GA nhận diện được
      // khách đến từ quảng cáo Facebook hay từ Google.
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
