"use client";

import { useMemo, useState } from "react";
import { foldVietnamese } from "@/lib/format";
import type { CoordinatorClass, CoordinatorGroup } from "@/lib/queries";
import { IconSearch, IconUsers, SubjectIcon } from "@/components/icons";
import { Card, EmptyState, field } from "@/components/ui";

type Row = CoordinatorClass & {
  stageLabel: string;
  stageClass: string;
  trialLabel: string | null;
  nextLabel: string | null;
  lastLabel: string | null;
  pausedLabel: string | null;
  createdLabel: string;
};

const TABS: { value: CoordinatorGroup; label: string; hint: string }[] = [
  { value: "trial_upcoming", label: "Chờ học thử", hint: "Đã xếp lịch học thử, chưa tới buổi — nhắc khách vào học đúng giờ." },
  { value: "trial_done", label: "Học thử xong", hint: "Đã học thử, chưa chốt — gọi / nhắn chăm khách đăng ký khóa." },
  { value: "studying", label: "Đang học", hint: "Khách đã vào học chính thức." },
  { value: "paused", label: "Tạm nghỉ", hint: "Khách tạm OFF — có ngày học lại thì hiện bên dưới." },
  { value: "ended", label: "Không học", hint: "Khách không học tiếp / đã nghỉ." },
];

export default function MyClassList({ rows }: { rows: Row[] }) {
  const counts = useMemo(() => {
    const m: Record<CoordinatorGroup, number> = { trial_upcoming: 0, trial_done: 0, studying: 0, paused: 0, ended: 0 };
    for (const r of rows) m[r.group]++;
    return m;
  }, [rows]);
  // Mở sẵn mục cần làm nhất đang có khách.
  const [tab, setTab] = useState<CoordinatorGroup>(
    () => (["trial_done", "trial_upcoming", "studying", "paused", "ended"] as CoordinatorGroup[]).find((g) => counts[g] > 0) ?? "trial_done"
  );
  const [q, setQ] = useState("");
  const needle = foldVietnamese(q.trim().toLowerCase());
  const shown = rows
    .filter((r) =>
      needle
        ? foldVietnamese(`${r.name} ${r.guardian ?? ""} ${r.phone ?? ""}`.toLowerCase()).includes(needle)
        : r.group === tab
    )
    // Có lịch sắp tới thì buổi gần nhất lên trước; còn lại khách mới đặt lên trước.
    .sort((a, b) =>
      a.nextDate && b.nextDate
        ? a.nextDate.localeCompare(b.nextDate)
        : a.nextDate
          ? -1
          : b.nextDate
            ? 1
            : b.createdAt.localeCompare(a.createdAt)
    );

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
            title={needle ? "Không tìm thấy khách nào" : "Chưa có khách nào ở mục này"}
            description={needle ? "Thử gõ tên khác hoặc số điện thoại." : ""}
          />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((r) => (
            <li key={r.classId} className="bg-white rounded-2xl border border-navy-100 p-4 space-y-2 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900 truncate">{r.name}</p>
                  {r.guardian && r.guardian !== r.name && (
                    <p className="text-xs text-ink-500 truncate">Phụ huynh: {r.guardian}</p>
                  )}
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${r.stageClass}`}>
                  {r.stageLabel}
                </span>
              </div>

              <p className="text-sm text-ink-600 flex items-center gap-1.5 flex-wrap">
                <SubjectIcon subject={r.subject} className="w-4 h-4 text-wood-500" />
                {r.subject}
                {r.schedule && <span className="tabular">· {r.schedule}</span>}
                <span className="text-ink-400">· {r.teacherName ? `GV ${r.teacherName}` : "Chưa xếp GV"}</span>
              </p>

              <ul className="text-xs text-ink-600 space-y-0.5 tabular">
                <li>Đặt hẹn: {r.createdLabel}</li>
                {r.group === "trial_upcoming" && (
                  <li>{r.nextLabel ? <>Học thử: <b className="text-ink-800">{r.nextLabel}</b></> : "Chưa có lịch học thử"}</li>
                )}
                {r.trialLabel && <li>Đã học thử: <b className="text-ink-800">{r.trialLabel}</b></li>}
                {r.regularSessions > 0 && (
                  <li>
                    Đã học {r.regularSessions} buổi chính thức{r.lastLabel ? ` · gần nhất ${r.lastLabel}` : ""}
                  </li>
                )}
                {r.group === "studying" && r.nextLabel && <li>Buổi tới: {r.nextLabel}</li>}
                {r.group === "paused" && r.pausedLabel && <li>Dự kiến học lại: {r.pausedLabel}</li>}
              </ul>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    r.paid ? "bg-mint-50 text-mint-700" : "bg-ivory-100 text-ink-500"
                  }`}
                >
                  {r.paid ? "✓ Đã đóng tiền" : "Chưa đóng tiền"}
                </span>
                {r.bonusTrial && (
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-wood-50 text-wood-700">
                    ✓ Thưởng học thử
                  </span>
                )}
                {r.bonusConversion && (
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-mint-50 text-mint-700">
                    ✓ Thưởng chốt lớp
                  </span>
                )}
                {r.phone && (
                  <a
                    href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}
                    className="ml-auto text-sm font-semibold text-navy-700 hover:underline tabular"
                  >
                    📞 {r.phone}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
