"use client";

import { useTransition } from "react";
import { setClassStageAction } from "@/actions/classes";

/**
 * Khách báo không học: chuyển sang "Không học" (cả các buổi khác trong tuần
 * của khách) — rời danh sách cần chăm, nằm ở mục "Khách không học".
 */
export default function NotStudyingButton({ classId, name }: { classId: number; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`${name} không học nữa? Khách chuyển sang mục "Khách không học" và rời khỏi lịch dạy.`)) return;
        startTransition(() => setClassStageAction(classId, "not_studying"));
      }}
      className="rounded-lg border border-navy-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-600 hover:border-coral-300 hover:text-coral-700 disabled:opacity-60"
    >
      {pending ? "Đang lưu..." : "Khách không học"}
    </button>
  );
}
