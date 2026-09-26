"use client";

import { useState, useTransition } from "react";
import { convertClassToLeadAction } from "@/actions/leads";

/**
 * Chuyển lớp chưa học buổi nào về danh sách Khách tiềm năng. Hỏi lại trước vì
 * lớp sẽ bị xoá khỏi trang Giao lớp (thông tin khách chuyển nguyên sang bên
 * Khách tiềm năng, không mất gì).
 */
export default function ToLeadButton({ classId }: { classId: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              "Chuyển khách này về danh sách Khách tiềm năng? Lớp sẽ được gỡ khỏi trang Giao lớp, thông tin khách giữ nguyên bên Khách tiềm năng."
            )
          )
            return;
          startTransition(async () => {
            const result = await convertClassToLeadAction(classId);
            setError(result.error ?? null);
          });
        }}
        className="text-sm border border-navy-200 text-ink-600 hover:bg-ivory-100 rounded-lg px-3 py-1.5 disabled:opacity-50 whitespace-nowrap"
      >
        {pending ? "Đang chuyển…" : "Về khách tiềm năng"}
      </button>
      {error && <span className="text-xs text-coral-600 max-w-[220px] text-right">{error}</span>}
    </span>
  );
}
