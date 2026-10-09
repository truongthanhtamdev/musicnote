"use client";

import { useMemo, useState, useTransition } from "react";
import { teacherDropTrialAction } from "@/actions/classes";
import Link from "next/link";
import { foldVietnamese } from "@/lib/format";
import { IconChat, IconFacebook, IconSearch, IconUsers, IconVideo, SubjectIcon } from "@/components/icons";
import { Card, EmptyState, ProgressBar, field, packageTone } from "@/components/ui";

export type StudentTab = "active" | "flexible" | "paused" | "ended";

export interface StudentGroup {
  key: string;
  /** Tên giáo viên đặt (nếu có), không thì tên khách. */
  name: string;
  realName: string;
  subject: string;
  tab: StudentTab;
  stage: string;
  phone: string | null;
  guardian: string | null;
  facebook: string | null;
  meetingUrl: string | null;
  messengerUrl: string | null;
  pausedUntil: string | null;
  progress: { used: number; total: number; remaining: number } | null;
  slots: { label: string; tab: StudentTab }[];
  lastDate: string | null;
  lastNumber: number | null;
  taught: number;
  nextDate: string | null;
  /** Lớp đang chạy để mở form sửa; null khi khách đã nghỉ/tạm nghỉ. */
  editClassId: number | null;
  /** Lớp linh động đang chạy — để mở sẵn form điểm danh đúng lớp. */
  flexibleClassId: number | null;
  /** Khách mới học thử, chưa học buổi chính thức — giáo viên tự gỡ lịch được. */
  dropTrialClassId: number | null;
  historyClassId: number;
}

type Row = StudentGroup & {
  stageLabel: string;
  stageClass: string;
  lastLabel: string | null;
  nextLabel: string | null;
  pausedLabel: string | null;
};

const TABS: { value: StudentTab; label: string; hint: string }[] = [
  { value: "active", label: "Đang học", hint: "Có lịch cố định hằng tuần." },
  {
    value: "flexible",
    label: "Linh động",
    hint: "Không có lịch cố định — học buổi nào thì vào Điểm danh → \"Điểm danh buổi học bù\".",
  },
  { value: "paused", label: "Tạm nghỉ", hint: "Trung tâm đã cho Tạm OFF — không hiện trong lịch dạy." },
  { value: "ended", label: "Đã nghỉ", hint: "Đã kết thúc hoặc ngừng học." },
];

export default function StudentList({ students }: { students: Row[] }) {
  const [tab, setTab] = useState<StudentTab>("active");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const m: Record<StudentTab, number> = { active: 0, flexible: 0, paused: 0, ended: 0 };
    for (const s of students) m[s.tab]++;
    return m;
  }, [students]);

  const needle = foldVietnamese(q.trim().toLowerCase());
  const shown = students.filter((s) => {
    if (needle) {
      const hay = foldVietnamese(`${s.name} ${s.realName} ${s.guardian ?? ""} ${s.phone ?? ""} ${s.subject}`.toLowerCase());
      return hay.includes(needle);
    }
    return s.tab === tab;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setTab(t.value);
              setQ("");
            }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold border transition ${
              tab === t.value && !needle
                ? "bg-wood-500 border-wood-500 text-white"
                : "bg-white border-navy-200 text-ink-700 hover:border-navy-300"
            }`}
          >
            {t.label} <span className="tabular opacity-80">{counts[t.value]}</span>
          </button>
        ))}
        <label className="relative ml-auto w-full sm:w-64">
          <IconSearch className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tên, SĐT..."
            className={`${field} pl-9 py-2`}
          />
        </label>
      </div>
      {!needle && <p className="text-xs text-ink-500 -mt-1">{TABS.find((t) => t.value === tab)!.hint}</p>}

      {shown.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<IconUsers className="w-6 h-6" />}
            title={needle ? "Không tìm thấy học viên nào" : "Chưa có học viên nào ở mục này"}
            description={needle ? "Thử gõ tên khác hoặc số điện thoại." : ""}
          />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((s) => (
            <li key={s.key} className="bg-white rounded-2xl border border-navy-100 p-4 space-y-2.5 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900 truncate">{s.name}</p>
                  {s.name !== s.realName && <p className="text-xs text-ink-400 truncate">Tên trung tâm: {s.realName}</p>}
                  {s.guardian && s.guardian !== s.realName && (
                    <p className="text-xs text-ink-500 truncate">Phụ huynh: {s.guardian}</p>
                  )}
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${s.stageClass}`}>
                  {s.stageLabel}
                </span>
              </div>

              <p className="text-sm text-ink-600 flex items-center gap-1.5 flex-wrap">
                <SubjectIcon subject={s.subject} className="w-4 h-4 text-wood-500" />
                {s.subject}
                <span className="text-ink-300">·</span>
                <span className="tabular">
                  {s.slots
                    .filter((sl) => sl.tab === s.tab || s.slots.length === 1)
                    .map((sl) => sl.label)
                    .join(" · ") || s.slots.map((sl) => sl.label).join(" · ")}
                </span>
              </p>

              {s.progress && (
                <div className="max-w-[260px]">
                  <p className="text-xs text-ink-500 mb-1 tabular">
                    Gói: đã học {s.progress.used}/{s.progress.total}
                    <span className={s.progress.remaining <= 3 ? "text-coral-600 font-semibold" : ""}>
                      {" "}
                      · còn {s.progress.remaining}
                    </span>
                  </p>
                  <ProgressBar value={s.progress.used} max={s.progress.total} tone={packageTone(s.progress.remaining)} />
                </div>
              )}

              <p className="text-xs text-ink-500 tabular">
                {s.lastLabel ? (
                  <>
                    Buổi gần nhất: <b className="text-ink-700">{s.lastLabel}</b>
                    {s.lastNumber ? ` (buổi ${s.lastNumber})` : ""}
                  </>
                ) : (
                  "Chưa điểm danh buổi nào"
                )}
                {s.taught > 0 && ` · bạn đã dạy ${s.taught} buổi`}
                {s.tab === "active" && s.nextLabel && (
                  <>
                    {" "}
                    · Buổi tới: <b className="text-ink-700">{s.nextLabel}</b>
                  </>
                )}
                {s.tab === "paused" && s.pausedLabel && (
                  <>
                    {" "}
                    · Dự kiến học lại: <b className="text-ink-700">{s.pausedLabel}</b>
                  </>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-sm">
                {s.phone && (
                  <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-navy-700 hover:underline tabular">
                    📞 {s.phone}
                  </a>
                )}
                {s.facebook && (
                  <a href={s.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy-700 hover:underline">
                    <IconFacebook className="w-4 h-4" /> Facebook
                  </a>
                )}
                {s.messengerUrl && (
                  <a href={s.messengerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy-700 hover:underline">
                    <IconChat className="w-4 h-4" /> Nhóm Messenger
                  </a>
                )}
                {s.meetingUrl && (
                  <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy-700 hover:underline">
                    <IconVideo className="w-4 h-4" /> Meet
                  </a>
                )}
              </div>

              {s.dropTrialClassId && <DropTrialButton classId={s.dropTrialClassId} name={s.name} />}

              <div className="flex flex-wrap items-center gap-3 border-t border-navy-100 pt-2.5 text-sm">
                <Link href={`/teacher/attendance?classId=${s.historyClassId}`} className="font-semibold text-ink-500 hover:text-wood-600">
                  Lịch sử điểm danh
                </Link>
                {s.tab === "flexible" && (
                  <Link
                    href={`/teacher/attendance?bu=${s.flexibleClassId ?? s.historyClassId}`}
                    className="font-semibold text-mint-700 hover:text-mint-800"
                  >
                    Điểm danh buổi vừa học
                  </Link>
                )}
                {s.editClassId && (
                  <Link
                    href={`/teacher/schedule?edit=${s.editClassId}#class-${s.editClassId}`}
                    className="ml-auto font-semibold text-wood-600 hover:text-wood-700"
                  >
                    Sửa lịch / thông tin
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Khách học thử xong không học tiếp: giáo viên tự gỡ khỏi lịch. */
function DropTrialButton({ classId, name }: { classId: number; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `${name} học thử xong không học tiếp? Khách sẽ được gỡ khỏi lịch dạy của bạn (chuyển sang "Rớt lớp"). Buổi học thử đã dạy vẫn được tính công.`
          )
        )
          return;
        startTransition(async () => {
          const res = await teacherDropTrialAction(classId);
          if (res.error) alert(res.error);
        });
      }}
      className="w-full rounded-xl border border-coral-200 bg-coral-50 px-3 py-2 text-sm font-semibold text-coral-700 hover:bg-coral-100 disabled:opacity-60"
    >
      {pending ? "Đang gỡ..." : "Học thử xong, không học tiếp — gỡ lịch"}
    </button>
  );
}
