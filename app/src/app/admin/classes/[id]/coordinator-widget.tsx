"use client";

import { useState, useTransition } from "react";
import { setClassCoordinatorAction } from "@/actions/classes";

/**
 * Ô gán giáo vụ phụ trách cho lớp có sẵn. Chọn xong lưu luôn.
 *
 * Không gán thì mọi khoản thưởng của khách này (học thử + chốt lớp) không ghi
 * cho ai cả — hệ thống thà thiếu còn hơn ghi nhầm người.
 */
export default function CoordinatorWidget({
  classId,
  current,
  staff,
}: {
  classId: number;
  current: number | null;
  staff: { id: number; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <select
        value={current ?? ""}
        disabled={pending}
        onChange={(e) => {
          const value = e.target.value ? Number(e.target.value) : null;
          startTransition(async () => {
            try {
              await setClassCoordinatorAction(classId, value);
              setError(null);
            } catch {
              setError("Không lưu được — bạn cần quyền Quản lý trở lên.");
            }
          });
        }}
        className="w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 disabled:opacity-60"
      >
        <option value="">— Chưa gán ai —</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-coral-600 mt-1.5">{error}</p>}
      <p className="text-xs text-ink-500 mt-2">
        Thưởng học thử và thưởng chốt lớp của khách này sẽ ghi cho người được gán. Chưa gán thì
        không khoản nào được ghi.
      </p>
    </div>
  );
}
