"use client";

import { useTransition } from "react";
import { assignTeacherAction } from "@/actions/classes";

interface TeacherOption {
  id: number;
  name: string;
  available: boolean;
}

export default function AssignRow({
  classId,
  teachers,
}: {
  classId: number;
  teachers: TeacherOption[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {teachers.map((t) => (
        <button
          key={t.id}
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => assignTeacherAction(classId, t.id))}
          className={`text-sm rounded-lg px-3 py-1.5 border transition ${
            t.available
              ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              : "border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          {t.available ? "✓ " : ""}
          {t.name}
        </button>
      ))}
      {teachers.length === 0 && (
        <p className="text-sm text-slate-400">Chưa có giáo viên nào trong hệ thống.</p>
      )}
    </div>
  );
}
