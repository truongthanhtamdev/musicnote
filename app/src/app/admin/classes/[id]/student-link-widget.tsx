"use client";

import { useTransition } from "react";
import { linkStudentAccountAction } from "@/actions/classes";
import type { UserRow } from "@/lib/types";

export default function StudentLinkWidget({
  classId,
  currentStudentUserId,
  students,
}: {
  classId: number;
  currentStudentUserId: number | null;
  students: UserRow[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-4">
      <h2 className="font-semibold text-ink-900 mb-1">Tài khoản học viên</h2>
      <p className="text-xs text-ink-500 mb-3">
        Gắn lớp này với 1 tài khoản để học viên tự đăng nhập xem lịch học, tiến độ.
      </p>
      <select
        defaultValue={currentStudentUserId ?? ""}
        disabled={isPending}
        onChange={(e) =>
          startTransition(() =>
            linkStudentAccountAction(classId, e.target.value ? Number(e.target.value) : null)
          )
        }
        className="w-full rounded-xl border border-navy-200 px-2 py-1.5 text-sm"
      >
        <option value="">Chưa gắn tài khoản</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.email})
          </option>
        ))}
      </select>
    </div>
  );
}
