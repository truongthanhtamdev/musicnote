"use client";

import { useState, useTransition } from "react";
import { setClassEditPermissionAction } from "@/actions/teachers";

/** Ô tick "Được sửa lớp học" cho nhân viên đặt hẹn — tick là lưu luôn. */
export default function ClassEditToggle({ userId, allowed }: { userId: number; allowed: boolean }) {
  const [on, setOn] = useState(allowed);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <label className="inline-flex flex-col gap-1 text-sm text-ink-700">
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <input
          type="checkbox"
          checked={on}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setOn(next);
            setError(null);
            startTransition(async () => {
              const res = await setClassEditPermissionAction(userId, next);
              if (res.error) {
                setOn(!next);
                setError(res.error);
              }
            });
          }}
          className="h-4 w-4 accent-wood-600"
        />
        Được sửa lớp học
      </span>
      {error && <span className="text-xs text-coral-600">{error}</span>}
    </label>
  );
}
