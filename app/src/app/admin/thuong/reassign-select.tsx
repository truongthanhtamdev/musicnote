"use client";

import { useState, useTransition } from "react";
import { setClassCoordinatorAction } from "@/actions/classes";
import { formatVND } from "@/lib/format";

/** Chọn lại người đặt hẹn của một khách — các khoản thưởng đã ghi đi theo người mới. */
export default function ReassignSelect({
  classId,
  current,
  staff,
}: {
  classId: number;
  current: number | null;
  staff: { id: number; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <select
        defaultValue={current ?? ""}
        disabled={pending}
        aria-label="Người đặt hẹn"
        onChange={(e) => {
          const v = e.target.value ? Number(e.target.value) : null;
          startTransition(async () => {
            const r = await setClassCoordinatorAction(classId, v);
            setNotice(r.movedCount > 0 ? `Đã chuyển ${r.movedCount} khoản (${formatVND(r.movedTotal)})` : "Đã lưu");
          });
        }}
        className="rounded-lg border border-navy-200 bg-white px-2 py-1 text-sm"
      >
        <option value="">— Chưa chọn —</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {pending ? <span className="text-xs text-ink-400">Đang lưu…</span> : notice && <span className="text-xs text-mint-700">{notice}</span>}
    </span>
  );
}
