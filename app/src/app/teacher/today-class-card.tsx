"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { IconAlert, SubjectIcon } from "@/components/icons";
import { UsedSessionsEditor } from "@/components/used-sessions-editor";
import { Avatar, ProgressBar, StatusChip, btn, packageTone } from "@/components/ui";
import { formatTimeRange } from "@/lib/format";
import type { PackageProgress } from "@/lib/queries";
import AttendanceForm from "./attendance-form";

export interface TodayClass {
  id: number;
  student_name: string;
  guardian_name: string | null;
  subject: string;
  level: string | null;
  language: string;
  start_time: string;
  duration_minutes: number;
  trial_pending: number;
}

export default function TodayClassCard({
  cls,
  sessionDate,
  progress,
  sessionNumber,
  overdue,
}: {
  cls: TodayClass;
  sessionDate: string;
  progress: PackageProgress | null;
  /** Buổi thứ mấy điền sẵn — 0 khi lớp còn chờ buổi học thử. */
  sessionNumber?: number;
  /** Đã qua giờ kết thúc mà chưa điểm danh. */
  overdue: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isTrial = !!cls.trial_pending;

  return (
    <li className="relative pl-6 sm:pl-8">
      {/* Trục thời gian */}
      <span
        className={`absolute left-0 top-6 w-3 h-3 rounded-full border-2 border-white ring-2 ${
          overdue ? "bg-coral-500 ring-coral-100" : "bg-amber-500 ring-amber-100"
        }`}
        aria-hidden="true"
      />
      <span
        className="absolute left-[5px] top-9 bottom-0 w-px bg-navy-100 last:hidden"
        aria-hidden="true"
      />

      <div
        className={`bg-white rounded-2xl border p-4 mb-3 transition ${
          overdue ? "border-coral-200 bg-coral-50/40" : "border-navy-100"
        }`}
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className="w-[62px] shrink-0">
            <p className="text-base font-bold text-ink-900 tabular leading-tight">
              {cls.start_time}
            </p>
            <p className="text-xs text-ink-400 tabular">
              – {formatTimeRange(cls.start_time, cls.duration_minutes).split(" - ")[1]}
            </p>
          </div>

          <Avatar name={cls.student_name} className="w-10 h-10 text-xs" />

          <div className="min-w-[140px] flex-1">
            <p className="font-semibold text-ink-900 truncate">
              {cls.student_name}
              {cls.language === "en" && (
                <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-navy-50 text-navy-700 align-middle">
                  EN
                </span>
              )}
            </p>
            <p className="text-sm text-ink-500 flex items-center gap-1.5 mt-0.5">
              <SubjectIcon subject={cls.subject} className="w-4 h-4 text-wood-500" />
              <span className="truncate">
                {cls.subject}
                {cls.level ? ` · ${cls.level}` : ""}
                {cls.guardian_name ? ` · PH: ${cls.guardian_name}` : ""}
              </span>
            </p>

            {progress && (
              <div className="mt-2 w-full max-w-[260px]">
                <div className="flex items-center justify-between text-xs mb-1 gap-2">
                  <span className="text-ink-500">
                    <UsedSessionsEditor progress={progress} size="xs" />
                  </span>
                  <span
                    className={`font-semibold tabular shrink-0 ${
                      progress.remaining <= 3
                        ? "text-coral-600"
                        : progress.remaining <= 5
                          ? "text-amber-700"
                          : "text-ink-500"
                    }`}
                  >
                    còn {progress.remaining}
                  </span>
                </div>
                <ProgressBar
                  value={progress.used}
                  max={progress.total}
                  tone={packageTone(progress.remaining)}
                />
              </div>
            )}
          </div>

          <div className="w-full sm:w-auto sm:ml-auto shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2">
            {isTrial ? (
              <StatusChip tone="wood">Buổi học thử</StatusChip>
            ) : sessionNumber !== undefined ? (
              <StatusChip tone="navy">Hôm nay là buổi {sessionNumber}</StatusChip>
            ) : null}
            {overdue && (
              <StatusChip tone="coral" icon={<IconAlert className="w-3.5 h-3.5" />}>
                Quá giờ
              </StatusChip>
            )}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={`${btn.primary} ${overdue ? "" : "bg-mint-500 hover:bg-mint-600"} px-3.5 py-2 ml-auto sm:ml-0`}
            >
              Điểm danh
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Điểm danh buổi học"
        subtitle={`${cls.student_name} · ${formatTimeRange(cls.start_time, cls.duration_minutes)} · ${cls.subject}`}
      >
        <AttendanceForm
          classId={cls.id}
          sessionDate={sessionDate}
          sessionNumber={sessionNumber}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </li>
  );
}
