import { getCenterContact } from "@/lib/queries";
import { IconChat, IconFacebook } from "./icons";

/**
 * Nút nhắn Facebook / Zalo cho trung tâm. Số và link lấy từ phần Cài đặt nên
 * đổi được ngay trên web; chưa khai cái nào thì nút đó không hiện, thà thiếu
 * một nút còn hơn dẫn khách tới link sai.
 *
 * `variant="floating"` là cụm nút nổi góc phải màn hình (trang chủ), còn
 * `"inline"` nằm trong nội dung (trang học viên).
 */
export function ContactButtons({
  variant = "inline",
  label = "Cần hỗ trợ? Nhắn cho trung tâm:",
}: {
  variant?: "inline" | "floating";
  label?: string;
}) {
  const { facebook, zalo } = getCenterContact();
  if (!facebook && !zalo) return null;

  if (variant === "floating") {
    return (
      <div className="fixed right-4 bottom-4 z-40 flex flex-col gap-2.5">
        {zalo && (
          <a
            href={`https://zalo.me/${zalo}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Nhắn Zalo cho trung tâm"
            className="w-13 h-13 rounded-full bg-[#0068ff] text-white shadow-lg flex items-center justify-center hover:brightness-110 transition"
          >
            <IconChat className="w-6 h-6" />
          </a>
        )}
        {facebook && (
          <a
            href={facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Nhắn Facebook cho trung tâm"
            className="w-13 h-13 rounded-full bg-[#1877f2] text-white shadow-lg flex items-center justify-center hover:brightness-110 transition"
          >
            <IconFacebook className="w-6 h-6" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {label && <span className="text-sm text-ink-600 w-full sm:w-auto">{label}</span>}
      {zalo && (
        <a
          href={`https://zalo.me/${zalo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0068ff] text-white px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition"
        >
          <IconChat className="w-4 h-4" />
          Nhắn Zalo
        </a>
      )}
      {facebook && (
        <a
          href={facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1877f2] text-white px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition"
        >
          <IconFacebook className="w-4 h-4" />
          Nhắn Facebook
        </a>
      )}
    </div>
  );
}
