"use client";

import { useTransition } from "react";
import { setPackageAction, renewPackageAction, sharePackageAction } from "@/actions/classes";
import { UsedSessionsEditor } from "@/components/used-sessions-editor";
import { PACKAGE_OPTIONS } from "@/lib/types";
import type { PackageProgress } from "@/lib/queries";

export default function PackageWidget({
  classId,
  progress,
  siblingsWithPackage,
}: {
  classId: number;
  progress: PackageProgress | null;
  siblingsWithPackage: { id: number; label: string; progress: PackageProgress }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-4">
      <h2 className="font-semibold text-ink-900 mb-3">Gói học</h2>
      {progress ? (
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-1">
            <UsedSessionsEditor progress={progress} size="sm" />
            <span
              className={`text-xs font-medium ${
                progress.remaining <= 3 ? "text-amber-600" : "text-ink-400"
              }`}
            >
              Còn {progress.remaining} tiết
            </span>
          </div>
          <div className="h-2 rounded-full bg-ivory-200 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                progress.remaining <= 3 ? "bg-amber-500" : "bg-wood-500"
              }`}
              style={{ width: `${Math.min(100, (progress.used / progress.total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-ink-400 mt-1">Bắt đầu tính từ {progress.startedAt}</p>
          {progress.sharedWith.length > 0 && (
            <p className="text-xs text-wood-600 mt-1">
              Dùng chung gói với {progress.sharedWith.length} lịch học khác của học viên này —
              học buổi nào cũng trừ chung vào {progress.total} tiết trên.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-500 mb-3">Lớp học đều đặn hàng tuần, không theo gói.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select
          defaultValue=""
          disabled={isPending}
          onChange={(e) =>
            startTransition(() =>
              setPackageAction(classId, e.target.value ? Number(e.target.value) : null)
            )
          }
          className="rounded-xl border border-navy-200 px-2 py-1.5 text-sm"
        >
          <option value="">
            {progress ? "-- Đổi thành gói riêng mới --" : "Không theo gói"}
          </option>
          {PACKAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              Gói {n} tiết mới (riêng)
            </option>
          ))}
        </select>
        {progress && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(`Đặt lại thành gói mới ${progress.total} tiết, tính từ hôm nay?`)) {
                startTransition(() => renewPackageAction(progress.packageId, progress.total));
              }
            }}
            className="text-sm border border-navy-200 text-ink-600 hover:bg-ivory-100 rounded-lg px-3 py-1.5"
          >
            Gia hạn (làm mới)
          </button>
        )}
      </div>

      {siblingsWithPackage.length > 0 && (
        <div className="mt-3 pt-3 border-t border-navy-100">
          <label className="block text-xs text-ink-500 mb-1">
            Học viên này có lịch học khác đã có gói — dùng chung gói đó (học 2-3 buổi/tuần
            cùng trừ vào 1 gói):
          </label>
          <select
            defaultValue=""
            disabled={isPending}
            onChange={(e) => {
              if (e.target.value) startTransition(() => sharePackageAction(classId, Number(e.target.value)));
            }}
            className="w-full rounded-xl border border-navy-200 px-2 py-1.5 text-sm"
          >
            <option value="">-- Chọn lịch học để dùng chung gói --</option>
            {siblingsWithPackage.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} (đã dùng {s.progress.used}/{s.progress.total} tiết)
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
