"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClassAction } from "@/actions/classes";

/**
 * Xoá hẳn một lớp. Hỏi lại trước khi xoá vì thao tác này không lấy lại được:
 * lớp đã điểm danh thì mất luôn lịch sử, nên lớp đang học thật thì nên đổi
 * trạng thái (Tạm OFF / DONE) chứ đừng xoá.
 *
 * `redirectTo` dành cho trang chi tiết lớp — xoá xong thì trang đó không còn
 * gì để hiện. Ở các trang danh sách thì bỏ trống, danh sách tự cập nhật.
 */
export default function DeleteClassButton({
  classId,
  label = "Xoá",
  redirectTo,
}: {
  classId: number;
  label?: string;
  redirectTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Xoá vĩnh viễn lớp học này? Toàn bộ lịch sử điểm danh sẽ mất.")) return;
        startTransition(async () => {
          await deleteClassAction(classId);
          if (redirectTo) router.push(redirectTo);
        });
      }}
      className="text-sm border border-coral-100 text-coral-600 hover:bg-coral-50 rounded-lg px-3 py-1.5 disabled:opacity-50"
    >
      {pending ? "Đang xoá..." : label}
    </button>
  );
}
