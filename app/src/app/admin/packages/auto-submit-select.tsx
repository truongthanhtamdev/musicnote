"use client";

import type { SelectHTMLAttributes } from "react";

/**
 * Ô chọn tự lọc ngay khi đổi, khỏi phải bấm nút "Lọc". Ngoài chuyện đỡ một
 * cú bấm, nó còn tránh cảnh trình duyệt nhớ lựa chọn cũ lúc tải lại trang:
 * ô hiện tên giáo viên A trong khi bảng vẫn liệt kê tất cả, nhìn như hỏng.
 */
export function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
