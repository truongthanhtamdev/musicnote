"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { updateClassAction, deleteClassAction } from "@/actions/classes";
import { UsedSessionsEditor } from "@/components/used-sessions-editor";
import type { FormState } from "@/actions/teachers";
import {
  DAY_LABELS,
  DAY_ORDER,
  DURATION_OPTIONS,
  SUBJECT_SUGGESTIONS,
  LANGUAGE_LABELS,
  SCHEDULE_TYPE_LABELS,
  formatClassSchedule,
  type ClassRow,
  type ClassScheduleType,
} from "@/lib/types";
import type { PackageProgress } from "@/lib/queries";
import { IconAlert, SubjectIcon } from "@/components/icons";
import { ProgressBar, btn, field, packageTone } from "@/components/ui";

const initialState: FormState = {};

export default function TeacherClassRow({
  cls,
  progress,
}: {
  cls: ClassRow;
  progress?: PackageProgress | null;
}) {
  const [editing, setEditing] = useState(false);
  const [scheduleType, setScheduleType] = useState<ClassScheduleType>(cls.schedule_type);
  const [state, formAction, pending] = useActionState(updateClassAction, initialState);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setEditing(false);
  }

  if (!editing) {
    return (
      <li className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-ink-900 truncate">
              {cls.student_name}
              {cls.language === "en" && (
                <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-navy-50 text-navy-700 align-middle">
                  EN
                </span>
              )}
            </p>
            <p className="text-sm text-ink-500 flex items-center gap-1.5 mt-0.5">
              <SubjectIcon subject={cls.subject} className="w-4 h-4 text-wood-500" />
              <span className="tabular">{formatClassSchedule(cls)}</span>
              <span className="text-ink-300">·</span>
              {cls.subject}
            </p>
            {progress && (
              <div className="mt-2 max-w-[220px]">
                <p className="text-xs text-ink-500 mb-1">
                  <UsedSessionsEditor progress={progress} size="xs" />
                  <span
                    className={
                      progress.remaining <= 3 ? "text-coral-600 font-medium" : "text-ink-500"
                    }
                  >
                    {" "}
                    · còn {progress.remaining}
                  </span>
                </p>
                <ProgressBar
                  value={progress.used}
                  max={progress.total}
                  tone={packageTone(progress.remaining)}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={`/teacher/attendance?classId=${cls.id}`}
              className="text-sm font-semibold text-ink-500 hover:text-wood-600"
            >
              Lịch sử
            </Link>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm font-semibold text-wood-600 hover:text-wood-700"
            >
              Sửa
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="px-4 py-3 bg-ivory-50">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={cls.id} />
        <input
          name="student_name"
          defaultValue={cls.student_name}
          required
          className={field}
          placeholder="Tên học viên"
          aria-label="Tên học viên"
        />

        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(SCHEDULE_TYPE_LABELS) as [ClassScheduleType, string][]).map(
            ([v, text]) => (
              <label key={v} className="block">
                <input
                  type="radio"
                  name="schedule_type"
                  value={v}
                  checked={scheduleType === v}
                  onChange={() => setScheduleType(v)}
                  className="peer sr-only"
                />
                <span className="block text-center border border-navy-200 rounded-xl py-2 px-2 text-xs font-semibold text-ink-700 transition cursor-pointer hover:border-navy-300 peer-checked:border-wood-400 peer-checked:bg-wood-50 peer-checked:text-wood-700">
                  {text}
                </span>
              </label>
            )
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {scheduleType === "fixed" && (
            <>
              <select
                name="day_of_week"
                defaultValue={cls.day_of_week}
                className={field}
                aria-label="Thứ học"
              >
                {DAY_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
              <input
                name="start_time"
                type="time"
                defaultValue={cls.start_time}
                required
                className={field}
                aria-label="Giờ bắt đầu"
              />
            </>
          )}
          <select
            name="duration_minutes"
            defaultValue={String(cls.duration_minutes)}
            className={`${field} col-span-2`}
            aria-label="Thời lượng"
          >
            {DURATION_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} phút
              </option>
            ))}
          </select>
          <input
            name="student_phone"
            defaultValue={cls.student_phone || ""}
            placeholder="SĐT"
            className={field}
            aria-label="Số điện thoại"
          />
          <input
            name="guardian_name"
            defaultValue={cls.guardian_name || ""}
            placeholder="Tên khách hàng"
            className={field}
            aria-label="Tên khách hàng"
          />
          <input
            name="facebook_url"
            defaultValue={cls.facebook_url || ""}
            placeholder="Facebook khách hàng"
            className={field}
            aria-label="Facebook khách hàng"
          />
          <input
            name="level"
            defaultValue={cls.level || ""}
            placeholder="Trình độ"
            className={field}
            aria-label="Trình độ"
          />
          <input
            name="subject"
            list="subject-suggestions"
            defaultValue={cls.subject}
            placeholder="Bộ môn"
            className={field}
            aria-label="Bộ môn"
          />
          <datalist id="subject-suggestions">
            {SUBJECT_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <select
            name="language"
            defaultValue={cls.language}
            className={field}
            aria-label="Ngôn ngữ"
          >
            {Object.entries(LANGUAGE_LABELS).map(([v, text]) => (
              <option key={v} value={v}>
                {text}
              </option>
            ))}
          </select>
          <input
            name="notes"
            defaultValue={cls.notes || ""}
            placeholder="Ghi chú"
            className={`${field} col-span-2`}
            aria-label="Ghi chú"
          />
        </div>

        {state.error && (
          <p className="text-xs text-coral-700 flex items-center gap-1.5">
            <IconAlert className="w-3.5 h-3.5" />
            {state.error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pending} className={btn.primary}>
            {pending ? "Đang lưu..." : "Lưu"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className={btn.ghost}>
            Huỷ
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              if (confirm("Xoá lớp học này? Toàn bộ lịch sử điểm danh của lớp sẽ mất.")) {
                startDeleteTransition(() => deleteClassAction(cls.id));
              }
            }}
            className={`${btn.danger} ml-auto`}
          >
            {isDeleting ? "Đang xoá..." : "Xoá lớp"}
          </button>
        </div>
      </form>
    </li>
  );
}
