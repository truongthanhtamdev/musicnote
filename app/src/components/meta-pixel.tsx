"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isPublicPath } from "@/lib/analytics";

/**
 * Meta Pixel (quảng cáo Facebook/Instagram) — đoạn mã thiết lập lấy nguyên
 * văn từ Events Manager, chỉ đổi mã pixel sang biến để khai được qua môi
 * trường (NEXT_PUBLIC_META_PIXEL_ID, nhiều mã cách nhau dấu phẩy).
 *
 * Cùng quy tắc với Google Analytics và pixel OpenAI: chỉ nạp ở trang công
 * khai, nhân sự vào trang quản trị không bị tính là khách xem quảng cáo.
 *
 * Web chuyển trang phía trình duyệt (không tải lại), nên đoạn mã gốc chỉ báo
 * PageView cho trang đầu tiên — những trang khách bấm sang sau phải tự báo.
 */
// Khai nhiều mã thì sự kiện fbq("track", …) tự gửi tới tất cả pixel đã init.
const DEFAULT_PIXEL_IDS = "1474158190921102,2927316544293818";
const PIXEL_IDS =
  process.env.NODE_ENV === "development"
    ? []
    : (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? DEFAULT_PIXEL_IDS)
        .split(",")
        .map((id) => id.trim())
        .filter((id) => /^\d{6,20}$/.test(id));

function pixelSnippet(pixelIds: string[]): string {
  return (
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
    `n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';` +
    `n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];` +
    `s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
    pixelIds.map((id) => `fbq('init','${id}');`).join("") +
    `fbq('track','PageView');`
  );
}

export function MetaPixel() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (PIXEL_IDS.length === 0 || !isPublicPath(pathname)) return;
    if (lastTracked.current === pathname) return;

    if (!window.fbq) {
      // Lần nạp đầu: đoạn mã gốc đã tự báo PageView cho trang này.
      const el = document.createElement("script");
      el.id = "meta-pixel";
      el.text = pixelSnippet(PIXEL_IDS);
      document.head.appendChild(el);
    } else {
      window.fbq("track", "PageView");
    }
    lastTracked.current = pathname;
  }, [pathname]);

  return null;
}
