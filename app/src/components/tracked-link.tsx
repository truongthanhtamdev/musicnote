"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Link ra ngoài có ghi nhận lượt bấm cho GA4 — dùng cho nút Zalo/Facebook.
 *
 * Khách của trung tâm nhắn tin nhiều hơn điền form, nên nếu không đo nút này
 * thì bức tranh chuyển đổi thiếu hẳn một nửa: trang nào kéo ra khách thật sự.
 */
export function TrackedLink({
  href,
  event,
  children,
  ...rest
}: {
  href: string;
  event: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent(event)}
      {...rest}
    >
      {children}
    </a>
  );
}
