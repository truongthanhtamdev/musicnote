"use client";

import { useTransition } from "react";
import { assignTeacherAction } from "@/actions/classes";

interface TeacherOption {
  id: number;
  name: string;
  available: boolean;
  speaksLanguage: boolean;
  teachesSubject: boolean;
}

export default function AssignRow({
  classId,
  teachers,
  needsLanguage,
  subject,
}: {
  classId: number;
  teachers: TeacherOption[];
  needsLanguage: boolean;
  subject: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {teachers.map((t) => {
        const fits = t.available && t.speaksLanguage && t.teachesSubject;
        return (
          <button
            key={t.id}
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => assignTeacherAction(classId, t.id))}
            className={`text-sm rounded-lg px-3 py-1.5 border transition ${
              fits
                ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {fits ? "✓ " : ""}
            {t.name}
            {!t.teachesSubject && <span className="text-amber-600"> (chưa dạy {subject})</span>}
            {needsLanguage && !t.speaksLanguage && (
              <span className="text-amber-600"> (chưa dạy được tiếng Anh)</span>
            )}
            {!t.available && t.speaksLanguage && t.teachesSubject && <span> (bận giờ này)</span>}
          </button>
        );
      })}
      {teachers.length === 0 && (
        <p className="text-sm text-slate-400">Chưa có giáo viên nào trong hệ thống.</p>
      )}
    </div>
  );
}
