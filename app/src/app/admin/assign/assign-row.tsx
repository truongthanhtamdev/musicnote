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
        // Gộp lý do thành một dòng: tách nhiều mẩu thì trên điện thoại mỗi
        // mẩu tự xuống hàng thành cột hẹp, nhìn rất rối.
        const reasons = [
          !t.teachesSubject && `chưa dạy ${subject}`,
          needsLanguage && !t.speaksLanguage && "chưa dạy được tiếng Anh",
          !t.available && t.speaksLanguage && t.teachesSubject && "bận giờ này",
        ].filter(Boolean);
        return (
          <button
            key={t.id}
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => assignTeacherAction(classId, t.id))}
            className={`inline-flex max-w-full items-center gap-1.5 text-left text-sm font-medium rounded-xl px-3 py-2 border transition disabled:opacity-60 ${
              fits
                ? "border-mint-300 text-mint-700 bg-mint-50 hover:bg-mint-100"
                : "border-navy-200 text-ink-600 bg-white hover:bg-ivory-100"
            }`}
          >
            {fits && <IconCheckCircle className="w-4 h-4 shrink-0" />}
            <span>
              {t.name}
              {fits && <span className="text-xs font-normal"> · rảnh giờ này</span>}
              {reasons.length > 0 && (
                <span
                  className={`text-xs font-normal ${
                    t.teachesSubject && t.speaksLanguage ? "text-ink-400" : "text-amber-700"
                  }`}
                >
                  {" "}
                  · {reasons.join(" · ")}
                </span>
              )}
            </span>
          </button>
        );
      })}
      {teachers.length === 0 && (
        <p className="text-sm text-ink-400">Chưa có giáo viên nào trong hệ thống.</p>
      )}
    </div>
  );
}
