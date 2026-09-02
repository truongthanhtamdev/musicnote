"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignTeacherAction,
  setClassStatusAction,
  deleteClassAction,
} from "@/actions/classes";

interface TeacherOption {
  id: number;
  name: string;
  available: boolean;
}

export default function ClassActions({
  classId,
  status,
  teacherId,
  teachers,
  canDelete,
}: {
  classId: number;
  status: string;
  teacherId: number | null;
  teachers: TeacherOption[];
  canDelete: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <select
        defaultValue={teacherId ?? ""}
        disabled={isPending}
        onChange={(e) =>
          startTransition(() =>
            assignTeacherAction(classId, e.target.value ? Number(e.target.value) : null)
          )
        }
        className="rounded-xl border border-navy-200 px-2 py-1.5 text-sm"
      >
        <option value="">Chưa xếp GV</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} {t.available ? "" : "(bận giờ này)"}
          </option>
        ))}
      </select>

      {status === "active" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => setClassStatusAction(classId, "paused"))}
          className="text-sm border border-amber-200 text-amber-700 hover:bg-amber-50 rounded-lg px-3 py-1.5"
        >
          Tạm dừng
        </button>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => setClassStatusAction(classId, "active"))}
          className="text-sm border border-mint-100 text-mint-700 hover:bg-mint-50 rounded-lg px-3 py-1.5"
        >
          Kích hoạt
        </button>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => setClassStatusAction(classId, "ended"))}
        className="text-sm border border-navy-200 text-ink-600 hover:bg-ivory-100 rounded-lg px-3 py-1.5"
      >
        Kết thúc lớp
      </button>
      {canDelete && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm("Xoá vĩnh viễn lớp học này? Toàn bộ lịch sử điểm danh sẽ mất.")) {
              startTransition(async () => {
                await deleteClassAction(classId);
                router.push("/admin/classes");
              });
            }
          }}
          className="text-sm border border-coral-100 text-coral-600 hover:bg-coral-50 rounded-lg px-3 py-1.5"
        >
          Xoá
        </button>
      )}
    </div>
  );
}
