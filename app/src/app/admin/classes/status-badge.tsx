import { classStage } from "@/lib/types";

/**
 * Nhãn trạng thái lớp theo đúng bảng màu trung tâm đang dùng tay, nên nhận
 * className riêng thay vì dùng tone của StatusChip.
 */
export default function ClassStatusBadge({ stage, wrap = false }: { stage: string; wrap?: boolean }) {
  const info = classStage(stage);
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${
        // Trong bảng nhiều cột thì cho nhãn dài xuống dòng, chứ một dòng
        // "Đã học thử, chờ đóng HP" đủ đẩy cả bảng tràn khỏi thẻ.
        wrap ? "" : "whitespace-nowrap"
      } ${info.className}`}
    >
      {info.label}
    </span>
  );
}
