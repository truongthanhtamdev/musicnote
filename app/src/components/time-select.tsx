import type { SelectHTMLAttributes } from "react";
import { TIME_SLOTS } from "@/lib/types";

/**
 * Chọn giờ bằng danh sách nửa tiếng thay cho `<input type="time">`.
 *
 * Đồng hồ mặc định của Android ở vài trình duyệt (Brave chẳng hạn) chỉ hiện
 * "Clear" và "Cancel", không có nút xác nhận — giáo viên xoay kim xong không
 * chốt được giờ nên không lưu nổi lớp. Danh sách thì máy nào cũng bấm được,
 * và cũng đúng với lưới lịch tuần vốn chia theo nửa tiếng.
 *
 * Giờ cũ nằm ngoài lưới (VD 08:15 nhập từ máy tính) vẫn được giữ nguyên trong
 * danh sách để sửa lớp không làm mất giờ đang có.
 */
export function TimeSelect({
  emptyLabel = "-- Chọn giờ --",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { emptyLabel?: string }) {
  const current = String(props.value ?? props.defaultValue ?? "");
  const options =
    current && !TIME_SLOTS.includes(current) ? [...TIME_SLOTS, current].sort() : TIME_SLOTS;

  return (
    <select {...props}>
      <option value="">{emptyLabel}</option>
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
