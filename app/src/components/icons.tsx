/**
 * Bộ icon dùng chung (stroke 1.75, viewBox 24) — thay cho emoji trong nội dung
 * nghiệp vụ. Mỗi icon nhận `className` để chỉnh kích thước/màu bằng Tailwind.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function Svg({ className = "w-5 h-5", children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </Svg>
);

export const IconClasses = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M8 3v3M16 3v3" />
    <circle cx="9" cy="15" r="1.6" />
    <path d="M10.6 15v-3l3.4-.8v3" />
  </Svg>
);

export const IconCalendarCheck = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M8 3v3M16 3v3M8.5 14.5l2.5 2.5 4.5-5" />
  </Svg>
);

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.6a3.2 3.2 0 0 1 0 6.3M17.5 14.6A5.5 5.5 0 0 1 20.5 20" />
  </Svg>
);

export const IconTeacher = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="7.5" r="3.3" />
    <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M12 2.5v1.7" />
  </Svg>
);

export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 20v-6M12.5 20V8M17 20v-9" />
  </Svg>
);

export const IconWallet = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1" />
    <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
    <circle cx="16.5" cy="13.5" r="1.2" />
  </Svg>
);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 15H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.5V4a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.4a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z" />
  </Svg>
);

export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 15.5V4M8 7.5 12 3.5l4 4" />
    <path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15" />
  </Svg>
);

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5V15M8 11l4 4 4-4" />
    <path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15" />
  </Svg>
);

export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9a6 6 0 1 1 12 0c0 3.2.7 5 1.5 6H4.5C5.3 14 6 12.2 6 9z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5 9.5 17 19 7" />
  </Svg>
);

export const IconCheckCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.2 11 15.2 16 9.5" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 2" />
  </Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.6 3.9 2.9 17.2A1.6 1.6 0 0 0 4.3 19.7h15.4a1.6 1.6 0 0 0 1.4-2.5L13.4 3.9a1.6 1.6 0 0 0-2.8 0z" />
    <path d="M12 9v4M12 16.3h.01" />
  </Svg>
);

export const IconPackage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 8.2 12 12.5 3.5 8.2" />
    <path d="M12 12.5V21" />
    <path d="M3.5 8.2 12 4l8.5 4.2v7.6L12 20l-8.5-4.2z" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Svg>
);

export const IconFilter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 5.5h17l-6.7 7.8V19l-3.6 2v-7.7z" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 5 7 7-7 7" />
  </Svg>
);

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 5-7 7 7 7" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 9 7 7 7-7" />
  </Svg>
);

export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const IconLogout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2" />
    <path d="M10 12h10M17 9l3 3-3 3" />
  </Svg>
);

export const IconKey = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="14" r="4.2" />
    <path d="m11.2 11 8.3-8.3M17 5.5l2 2M14.5 8l2 2" />
  </Svg>
);

export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Svg>
);

export const IconFacebook = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <path d="M15 8h-1.5A2.5 2.5 0 0 0 11 10.5V21" />
    <path d="M8.5 13.5h5.5" />
  </Svg>
);

export const IconGuitar = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 3.5 17 6l2.5-1L21 6.5l-1 2.5 2 2.5-2 1.5" />
    <path d="M13.8 6.7 9.6 10.9" />
    <path d="M11 12.5a4.2 4.2 0 1 1-3.6 6.9c-1.4-1.4-3.9-.8-5-1.9-1-1.1.3-2.6 1.6-3.6 1.4-1.1.5-3.4 2-4.4 1.6-1 4 .1 5 3z" />
    <circle cx="8.4" cy="15.6" r="1.4" />
  </Svg>
);

export const IconPiano = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 14h18" />
    <path d="M7.5 5v9M12 5v9M16.5 5v9" />
  </Svg>
);

export const IconViolin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15.5 3.5 20.5 8.5" />
    <path d="M14 6.5 9.5 11" />
    <path d="M11.5 12.5a4 4 0 1 1-4.2 6.6c-1.3-1.3-3.6-.7-4.6-1.7-.9-1 .3-2.4 1.5-3.4 1.3-1 .5-3.1 1.9-4.1 1.4-.9 3.7.1 4.6 2.8z" />
  </Svg>
);

export const IconMic = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="10" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21M9 21h6" />
  </Svg>
);

export const IconMusic = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 18V6l11-2v12" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="16" r="2.5" />
  </Svg>
);

export const IconMore = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" />
  </Svg>
);

/** Icon theo bộ môn — dùng chung ở card lớp, bảng học viên và bước chọn môn. */
export function SubjectIcon({ subject, className }: { subject: string; className?: string }) {
  const s = subject.toLowerCase();
  if (s.includes("piano")) return <IconPiano className={className} />;
  if (s.includes("violin")) return <IconViolin className={className} />;
  if (s.includes("thanh nhạc") || s.includes("vocal")) return <IconMic className={className} />;
  if (s.includes("guitar")) return <IconGuitar className={className} />;
  return <IconMusic className={className} />;
}
