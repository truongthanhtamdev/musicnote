"use client";

import { useTransition } from "react";
import { setPackageAction } from "@/actions/classes";
import { PACKAGE_OPTIONS } from "@/lib/types";
import type { PackageProgress } from "@/lib/queries";

export default function PackageWidget({
  classId,
  currentTotal,
  progress,
}: {
  classId: number;
  currentTotal: number | null;
  progress: PackageProgress | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold text-slate-900 mb-3">Gói học</h2>
      {progress ? (
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm text-slate-600">
              Đã học <span className="font-semibold text-slate-900">{progress.used}</span> /{" "}
              {progress.total} tiết
            </span>
            <span
              className={`text-xs font-medium ${
                progress.remaining <= 3 ? "text-amber-600" : "text-slate-400"
              }`}
            >
              Còn {progress.remaining} tiết
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                progress.remaining <= 3 ? "bg-amber-500" : "bg-indigo-600"
              }`}
              style={{ width: `${Math.min(100, (progress.used / progress.total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Bắt đầu tính từ {progress.startedAt}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-500 mb-3">Lớp học đều đặn hàng tuần, không theo gói.</p>
      )}
      <div className="flex items-center gap-2">
        <select
          defaultValue={currentTotal ?? ""}
          disabled={isPending}
          onChange={(e) =>
            startTransition(() =>
              setPackageAction(classId, e.target.value ? Number(e.target.value) : null)
            )
          }
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Không theo gói</option>
          {PACKAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              Gói {n} tiết
            </option>
          ))}
        </select>
        {progress && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(`Đặt lại thành gói mới ${progress.total} tiết, tính từ hôm nay?`)) {
                startTransition(() => setPackageAction(classId, progress.total));
              }
            }}
            className="text-sm border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg px-3 py-1.5"
          >
            Gia hạn (làm mới)
          </button>
        )}
      </div>
    </div>
  );
}
