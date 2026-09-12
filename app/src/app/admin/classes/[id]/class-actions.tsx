"use client";

import { useTransition } from "react";
import { assignTeacherAction } from "@/actions/classes";
import DeleteClassButton from "../delete-class-button";
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
      {canDelete && <DeleteClassButton classId={classId} redirectTo="/admin/classes" />}
    </div>
  );
}
