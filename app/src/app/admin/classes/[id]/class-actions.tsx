"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignTeacherAction, deleteClassAction } from "@/actions/classes";
import ClassStagePicker from "./stage-picker";

interface TeacherOption {
  id: number;
  name: string;
  available: boolean;
}

export default function ClassActions({
  classId,
  stage,
  pausedUntil,
  hasSchedule,
  teacherId,
  teachers,
  canDelete,
}: {
  classId: number;
  stage: string;
  pausedUntil: string | null;
  hasSchedule: boolean;
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

      <ClassStagePicker
        classId={classId}
        stage={stage}
        pausedUntil={pausedUntil}
        hasSchedule={hasSchedule}
      />
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
