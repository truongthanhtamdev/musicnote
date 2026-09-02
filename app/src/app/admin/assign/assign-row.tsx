"use client";

import { useTransition } from "react";
import { assignTeacherAction } from "@/actions/classes";
import { IconCheckCircle } from "@/components/icons";

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
            className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-xl px-3 py-2 border transition disabled:opacity-60 ${
              fits
                ? "border-mint-300 text-mint-700 bg-mint-50 hover:bg-mint-100"
                : "border-navy-200 text-ink-600 bg-white hover:bg-ivory-100"
            }`}
          >
            {fits && <IconCheckCircle className="w-4 h-4" />}
            {t.name}
            {fits && <span className="text-xs font-normal">· rảnh giờ này</span>}
            {!t.teachesSubject && (
              <span className="text-xs font-normal text-amber-700">· chưa dạy {subject}</span>
            )}
            {needsLanguage && !t.speaksLanguage && (
              <span className="text-xs font-normal text-amber-700">· chưa dạy được tiếng Anh</span>
            )}
            {!t.available && t.speaksLanguage && t.teachesSubject && (
              <span className="text-xs font-normal text-ink-400">· bận giờ này</span>
            )}
          </button>
        );
      })}
      {teachers.length === 0 && (
        <p className="text-sm text-ink-400">Chưa có giáo viên nào trong hệ thống.</p>
      )}
    </div>
  );
}
