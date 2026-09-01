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
          className={`${inputWidth} rounded border border-slate-300 px-1.5 py-0.5 ${text}`}
        />
        / {progress.total} tiết
        <button type="submit" className="text-gold-700 hover:underline">
          Lưu
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-slate-400 hover:text-slate-600"
        >
          Huỷ
        </button>
      </form>
    );
  }

  return (
    <span className={text}>
      Đã học <span className="font-semibold text-slate-900">{progress.used}</span> / {progress.total}{" "}
      tiết
      <button
        type="button"
        disabled={isPending}
        onClick={() => setEditing(true)}
        className="ml-1.5 text-gold-600 hover:underline"
      >
        Sửa
      </button>
      {showRevert && progress.isManuallyAdjusted && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => adjustPackageUsedAction(progress.packageId, null))}
          className="ml-1.5 text-slate-400 hover:text-slate-600"
          title="Bỏ chỉnh tay, tính lại tự động theo điểm danh"
        >
          (đã chỉnh tay · bấm để tự tính lại)
        </button>
      )}
    </span>
  );
}
