"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Link Facebook mở thẳng APP Facebook trên điện thoại (đa số khách dùng điện
 * thoại, mở trong trình duyệt thì chưa đăng nhập, không kết bạn được).
 *
 * - Android: link intent:// mở app Facebook, máy không có app thì tự về link web.
 * - iPhone: thử fb://, sau 1,5 giây vẫn còn ở trang (chưa có app) thì mở link web.
 * - Máy tính: mở link web như bình thường.
 */
export function FbAppLink({
  href,
  event,
  className,
  children,
}: {
  href: string;
  event?: string;
  className?: string;
  children: ReactNode;
}) {
  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (event) trackEvent(event);
    const ua = navigator.userAgent;
    let web: URL;
    try {
      web = new URL(href);
    } catch {
      return;
    }
    // m.me tự mở app Messenger; chỉ cần đổi đường cho link hồ sơ Facebook.
    if (!/facebook\.com$/i.test(web.hostname.replace(/^(www|m)\./, ""))) return;

    if (/Android/i.test(ua)) {
      e.preventDefault();
      const path = `${web.host}${web.pathname}${web.search}`;
      window.location.href = `intent://${path}#Intent;scheme=https;package=com.facebook.katana;S.browser_fallback_url=${encodeURIComponent(href)};end`;
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      e.preventDefault();
      const fallback = window.setTimeout(() => {
        if (!document.hidden) window.location.href = href;
      }, 1500);
      document.addEventListener("visibilitychange", () => window.clearTimeout(fallback), { once: true });
      window.location.href = `fb://facewebmodal/f?href=${encodeURIComponent(href)}`;
    }
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>
      {children}
    </a>
  );
}
