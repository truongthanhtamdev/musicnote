"use client";

import { useState } from "react";
import { inlineAction } from "./ui";

/**
 * Chép link chấm sao của một buổi để gửi cho khách qua Zalo.
 *
 * Chép vào clipboard chứ không mở sẵn Zalo: giáo vụ thường đang nhắn dở với
 * khách trong một cửa sổ khác, dán vào đó nhanh hơn.
 */
export function RatingLinkButton({ token, stars }: { token: string | null; stars: number | null }) {
  const [copied, setCopied] = useState(false);

  if (stars) {
    return (
      <span className="text-sm text-amber-600 whitespace-nowrap" title={`Khách chấm ${stars}/5 sao`}>
        {"★".repeat(stars)}
        <span className="text-ink-200">{"★".repeat(5 - stars)}</span>
      </span>
    );
  }
  if (!token) return <span className="text-ink-300">–</span>;

  return (
    <button
      type="button"
      className={inlineAction}
      onClick={async () => {
        const url = `${window.location.origin}/danh-gia/${token}`;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          // Trình duyệt chặn clipboard (hay gặp khi không phải HTTPS) thì hỏi
          // cửa sổ nhắc để giáo vụ tự chép — thà thủ công còn hơn im lặng.
          window.prompt("Chép link này gửi cho khách:", url);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Đã chép link ✓" : "Chép link chấm sao"}
    </button>
  );
}
