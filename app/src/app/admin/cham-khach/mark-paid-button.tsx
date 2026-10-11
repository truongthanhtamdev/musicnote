"use client";

import { useTransition } from "react";
import { markClassPaidAction } from "@/actions/classes";

/** Lớp cũ đã thu tiền ngoài hệ thống: gắn nhãn "Đã đóng tiền", rời danh sách cần chăm. */
export default function MarkPaidButton({
  classId,
  name,
  paid = true,
  className,
}: {
  classId: number;
  name: string;
  /** false = nút "Bỏ đánh dấu". */
  paid?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const msg = paid
          ? `${name} đã đóng tiền rồi? Khách sẽ rời danh sách cần chăm và thôi bị nhắc "chưa đóng học phí".`
          : `Bỏ nhãn "Đã đóng tiền" của ${name}?`;
        if (!confirm(msg)) return;
        startTransition(async () => {
          const res = await markClassPaidAction(classId, paid);
          if (res.error) alert(res.error);
        });
      }}
      className={
        className ??
        "rounded-lg border border-mint-300 bg-mint-50 px-2.5 py-1 text-xs font-semibold text-mint-700 hover:bg-mint-100 disabled:opacity-60"
      }
    >
      {pending ? "Đang lưu..." : paid ? "✓ Đã đóng tiền" : "Bỏ đánh dấu"}
    </button>
  );
}
