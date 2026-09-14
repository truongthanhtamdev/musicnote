import { IconVideo } from "./icons";

/**
 * Nút "Vào lớp" mở phòng học online của lớp.
 *
 * Không hiện gì khi lớp chưa có link, thay vì hiện nút chết — giáo viên bấm
 * nút không chạy còn khó chịu hơn là không có nút.
 */
export function JoinClassLink({
  url,
  size = "md",
}: {
  url: string | null | undefined;
  size?: "sm" | "md";
}) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 font-semibold text-white bg-mint-600 hover:bg-mint-700 rounded-lg whitespace-nowrap ${
        size === "sm" ? "text-xs px-2.5 py-1.5" : "text-sm px-3 py-2"
      }`}
    >
      <IconVideo className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      Vào lớp
    </a>
  );
}
