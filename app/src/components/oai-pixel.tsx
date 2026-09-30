"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isPublicPath } from "@/lib/analytics";

/**
 * Pixel quảng cáo OpenAI (ChatGPT Ads) — đoạn mã thiết lập lấy nguyên văn từ
 * trang quảng cáo, chỉ đổi mã pixel sang biến để khai được qua môi trường.
 *
 * Chỉ nạp khi khách vào trang công khai, cùng quy tắc với Google Analytics:
 * nhân sự vào trang quản trị không bị tính là khách xem quảng cáo. Nạp một
 * lần là đủ — đoạn mã tự bỏ qua nếu `window.oaiq` đã có.
 */
const DEFAULT_PIXEL_ID = "QgWCy81TZ9N9tAdneCdcf1";
const RAW_ID = (process.env.NEXT_PUBLIC_OAI_PIXEL_ID ?? DEFAULT_PIXEL_ID).trim();
const PIXEL_ID = process.env.NODE_ENV !== "development" && /^[A-Za-z0-9_-]{8,64}$/.test(RAW_ID) ? RAW_ID : "";

function pixelSnippet(pixelId: string): string {
  return (
    `!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;` +
    `var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}` +
    `(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");` +
    `oaiq("init",{pixelId:"${pixelId}",debug:true});`
  );
}

export function OaiPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (!PIXEL_ID || !isPublicPath(pathname)) return;
    if ((window as unknown as { oaiq?: unknown }).oaiq) return;
    const el = document.createElement("script");
    el.id = "oai-pixel";
    el.text = pixelSnippet(PIXEL_ID);
    document.head.appendChild(el);
  }, [pathname]);

  return null;
}
