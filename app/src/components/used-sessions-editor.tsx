"use client";

import { useState, useTransition } from "react";
import { adjustPackageUsedAction } from "@/actions/classes";
import type { PackageProgress } from "@/lib/queries";

/** Inline "Đã học X/Y tiết" display with a manual-correction editor, shared by the admin package widget and the teacher's own class row. */
export function UsedSessionsEditor({
  progress,
  size = "sm",
  showRevert = true,
}: {
  progress: PackageProgress;
  size?: "sm" | "xs";
  showRevert?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const text = size === "xs" ? "text-xs" : "text-sm";
  const inputWidth = size === "xs" ? "w-14" : "w-16";

  if (editing) {
    return (
      <form
        className={`inline-flex items-center gap-1.5 ${text}`}
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("used");
          const used = value === "" ? null : Number(value);
          startTransition(() => adjustPackageUsedAction(progress.packageId, used));
          setEditing(false);
        }}
      >
        Đã học
        <input
          name="used"
          type="number"
          min={0}
          defaultValue={progress.used}
          autoFocus
          aria-label="Số buổi đã học"
          className={`${inputWidth} rounded-lg border border-navy-200 bg-white px-2 py-0.5 tabular focus:border-wood-400 focus:ring-2 focus:ring-wood-500/20 focus:outline-none ${text}`}
        />
        / {progress.total} tiết
        <button type="submit" className="font-semibold text-wood-700 hover:text-wood-800">
          Lưu
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-ink-400 hover:text-ink-700"
        >
          Huỷ
        </button>
      </form>
    );
  }

  return (
    <span className={`${text} tabular`}>
      Đã học <span className="font-semibold text-ink-900">{progress.used}</span> / {progress.total}{" "}
      tiết
      <button
        type="button"
        disabled={isPending}
        onClick={() => setEditing(true)}
        className="ml-1.5 font-semibold text-wood-600 hover:text-wood-700 disabled:opacity-60"
      >
        Sửa
      </button>
      {showRevert && progress.isManuallyAdjusted && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => adjustPackageUsedAction(progress.packageId, null))}
          className="ml-1.5 text-ink-400 hover:text-ink-700 disabled:opacity-60"
          title="Bỏ chỉnh tay, tính lại tự động theo điểm danh"
        >
          (đã chỉnh tay · bấm để tự tính lại)
        </button>
      )}
    </span>
  );
}
