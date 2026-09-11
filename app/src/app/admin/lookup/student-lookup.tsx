"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CustomerProfile, StudentProfile } from "@/lib/queries";
import { foldVietnamese, formatVND, normalizeFacebookUrl } from "@/lib/format";
import { ATTENDANCE_STATUS_LABELS, classStage, formatClassSchedule } from "@/lib/types";
import { IconSearch, SubjectIcon } from "@/components/icons";
import { Avatar, EmptyState, ProgressBar, StatusChip, field, packageTone } from "@/components/ui";
import ClassStatusBadge from "../classes/status-badge";

const MAX_RESULTS = 25;

/**
 * Tra tên rồi xem hồ sơ đầy đủ để chăm sóc khách.
 *
 * Gom theo KHÁCH HÀNG chứ không theo từng lớp: một phụ huynh hay đăng ký
 * nhiều lớp — một bé học hai bộ môn, hoặc hai ba anh em cùng học — nên phải
 * thấy cả nhà một lượt thì mới biết còn bao nhiêu tiết và thiếu bao nhiêu
 * học phí trước khi gọi.
 *
 * Lọc ngay trên máy chứ không gọi lại server: trung tâm cỡ vài trăm học viên,
 * dữ liệu đã có sẵn trên trang nên gõ tới đâu lọc tới đó, không phải chờ.
 */
export default function StudentLookup({ customers }: { customers: CustomerProfile[] }) {
  const [q, setQ] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Gộp sẵn mọi thứ có thể gõ vào ô tìm kiếm, bỏ dấu để gõ "tam" ra "Tâm".
  const haystacks = useMemo(
    () =>
      customers.map((c) =>
        foldVietnamese(
          [
            c.customerName,
            ...c.phones,
            ...c.students.flatMap((s) => [
              s.studentName,
              ...s.subjects,
              ...s.teachers,
              ...s.classes.map((k) => k.code ?? ""),
            ]),
          ].join(" ")
        )
      ),
    [customers]
  );

  const results = useMemo(() => {
    const needle = foldVietnamese(q.trim());
    if (!needle) return [];
    const found: CustomerProfile[] = [];
    for (let i = 0; i < customers.length && found.length < MAX_RESULTS; i++) {
      if (haystacks[i].includes(needle)) found.push(customers[i]);
    }
    return found;
  }, [customers, haystacks, q]);

  const studentCount = customers.reduce((n, c) => n + c.students.length, 0);

  return (
    <div>
      <div className="p-5 pb-3 relative">
        <IconSearch className="w-4 h-4 absolute left-8 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpenKey(null);
          }}
          autoFocus
          placeholder="Tên học viên, tên khách hàng, SĐT hoặc mã lớp..."
          aria-label="Tra cứu học viên"
          className={`${field} pl-9`}
        />
        <p className="text-xs text-ink-400 mt-2">
          Đang quản lý {studentCount} học viên của {customers.length} khách hàng.
          {q && ` Tìm thấy ${results.length}${results.length === MAX_RESULTS ? "+" : ""}.`}
        </p>
      </div>

      {!q ? (
        <EmptyState
          icon={<IconSearch className="w-6 h-6" />}
          title="Gõ tên để tra cứu"
          description="Hồ sơ gồm liên hệ, tất cả các bé đang học, lớp, giáo viên, tiến độ gói và học phí."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<IconSearch className="w-6 h-6" />}
          title="Không tìm thấy ai"
          description={`Không có khách hàng hay học viên nào khớp với "${q}".`}
        />
      ) : (
        <ul className="divide-y divide-navy-100 border-t border-navy-100">
          {results.map((c) => (
            <CustomerRow
              key={c.key}
              customer={c}
              open={openKey === c.key}
              onToggle={() => setOpenKey(openKey === c.key ? null : c.key)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomerRow({
  customer: c,
  open,
  onToggle,
}: {
  customer: CustomerProfile;
  open: boolean;
  onToggle: () => void;
}) {
  const fb = c.facebookUrl ? normalizeFacebookUrl(c.facebookUrl) : null;
  const names = c.students.map((s) => s.studentName);

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full px-5 py-3.5 flex flex-wrap items-center gap-3 text-left hover:bg-ivory-50 transition"
      >
        <Avatar name={c.customerName} className="w-9 h-9 text-xs" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-900 truncate">{c.customerName}</p>
          <p className="text-sm text-ink-500 truncate">
            {c.students.length > 1 || names[0] !== c.customerName
              ? `${names.join(", ")} · `
              : ""}
            {c.classCount} lớp
            {c.phones.length > 0 ? ` · ${c.phones[0]}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {c.totalSessions > 0 && (
            <StatusChip tone={packageTone(c.remainingSessions)}>
              Còn {c.remainingSessions}/{c.totalSessions} tiết
            </StatusChip>
          )}
          {c.outstanding > 0 && <StatusChip tone="coral">Thiếu {formatVND(c.outstanding)}</StatusChip>}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 bg-ivory-50/60">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 [&>*]:min-w-0">
            <div className="rounded-xl border border-navy-100 bg-white px-3.5 py-3">
              <p className="text-xs text-ink-500 mb-1">Liên hệ</p>
              <p className="text-sm text-ink-900">{c.customerName}</p>
              {c.phones.length > 0 ? (
                c.phones.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="block text-sm text-wood-600 hover:underline tabular"
                  >
                    {phone}
                  </a>
                ))
              ) : (
                <p className="text-sm text-ink-400">Chưa có số điện thoại</p>
              )}
              {fb && (
                <a
                  href={fb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-wood-600 hover:underline"
                >
                  Nhắn Facebook
                </a>
              )}
            </div>

            <div className="rounded-xl border border-navy-100 bg-white px-3.5 py-3">
              <p className="text-xs text-ink-500 mb-1">
                Gói học {c.students.length > 1 ? "(cả nhà)" : ""}
              </p>
              {c.totalSessions > 0 ? (
                <>
                  <p className="text-sm text-ink-900 tabular">
                    Đã học {c.usedSessions}/{c.totalSessions} tiết · còn{" "}
                    <span className="font-semibold">{c.remainingSessions}</span>
                  </p>
                  <div className="mt-2">
                    <ProgressBar
                      value={c.usedSessions}
                      max={c.totalSessions}
                      tone={packageTone(c.remainingSessions)}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-400">Chưa đăng ký gói</p>
              )}
            </div>

            <div className="rounded-xl border border-navy-100 bg-white px-3.5 py-3">
              <p className="text-xs text-ink-500 mb-1">Học phí</p>
              <p className="text-sm text-ink-900 tabular">Đã thu {formatVND(c.paid)}</p>
              <p
                className={`text-sm tabular ${
                  c.outstanding > 0 ? "text-coral-600 font-semibold" : "text-mint-700"
                }`}
              >
                {c.outstanding > 0 ? `Còn thiếu ${formatVND(c.outstanding)}` : "Đã đủ"}
              </p>
            </div>
          </div>

          {c.students.map((s) => (
            <StudentBlock key={s.key} student={s} showTotals={c.students.length > 1} />
          ))}

          <p className="text-sm text-ink-600">
            {c.lastSession ? (
              <>
                Buổi gần nhất: <span className="tabular">{c.lastSession.date}</span> ·{" "}
                {ATTENDANCE_STATUS_LABELS[c.lastSession.status]}
                {c.lastSession.lessonContent ? ` — ${c.lastSession.lessonContent}` : ""}
              </>
            ) : (
              "Chưa có buổi nào được điểm danh."
            )}
          </p>
        </div>
      )}
    </li>
  );
}

/**
 * Một bé trong nhà: các lớp của bé đó. Khi nhà có nhiều bé thì kèm luôn số
 * tiết và học phí riêng của bé, vì con số gộp ở trên không cho biết bé nào
 * sắp hết tiết.
 */
function StudentBlock({ student: s, showTotals }: { student: StudentProfile; showTotals: boolean }) {
  const pausedDates = s.classes
    .filter((c) => classStage(c.stage).paused && c.paused_until)
    .map((c) => c.paused_until);

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-2">
        <p className="text-sm font-semibold text-ink-900">{s.studentName}</p>
        <p className="text-xs text-ink-500">
          {s.classes.length} lớp
          {s.teachers.length > 0 ? ` · GV ${s.teachers.join(", ")}` : ""}
        </p>
        {showTotals && s.totalSessions > 0 && (
          <span className="text-xs text-ink-500 tabular">
            · còn {s.remainingSessions}/{s.totalSessions} tiết
          </span>
        )}
        {showTotals && s.outstanding > 0 && (
          <span className="text-xs text-coral-600 font-semibold tabular">
            · thiếu {formatVND(s.outstanding)}
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {s.classes.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-navy-100 bg-white px-3.5 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5"
          >
            <SubjectIcon subject={c.subject} className="w-4 h-4 text-wood-500" />
            <span className="text-sm font-medium text-ink-900 tabular">
              {formatClassSchedule(c)}
            </span>
            <span className="text-sm text-ink-500 truncate">
              {c.subject} · {c.teacher_name || "Chưa xếp GV"}
              {c.code ? ` · ${c.code}` : ""}
            </span>
            <span className="ml-auto flex items-center gap-2">
              <ClassStatusBadge stage={c.stage} />
              <Link
                href={`/admin/classes/${c.id}`}
                className="text-sm font-semibold text-wood-600 hover:text-wood-700 whitespace-nowrap"
              >
                Mở lớp
              </Link>
            </span>
          </li>
        ))}
      </ul>

      {pausedDates.length > 0 && (
        <p className="text-sm text-amber-700 mt-2">
          Đang tạm nghỉ, hẹn học lại: {pausedDates.join(", ")}
        </p>
      )}
    </div>
  );
}
