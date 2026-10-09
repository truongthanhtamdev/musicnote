"use client";

import { useState, useTransition } from "react";
import { setClassStageAction } from "@/actions/classes";
import { CLASS_STAGES, DAY_LABELS, classStage } from "@/lib/types";
import { addDays, toISODate, now } from "@/lib/format";
import { TimeSelect } from "@/components/time-select";
import { btn, field } from "@/components/ui";
import ClassStatusBadge from "../status-badge";

/**
 * Chọn trạng thái lớp theo bảng màu trung tâm.
 *
 * Hai trạng thái cần hỏi thêm trước khi lưu:
 * - Tạm OFF: hỏi ngày dự kiến học lại, để trang giáo vụ nhắc khi gần tới.
 * - Cho học lại một lớp chưa có lịch cố định (lớp Tạm OFF nhập từ Excel không
 *   kèm ngày/giờ): phải xếp lịch luôn, nếu không lớp "đang học" mà không nằm
 *   trong lịch tuần nào — giáo viên không thấy và không ai điểm danh.
 */
export default function ClassStagePicker({
  classId,
  stage,
  siblingSlots = [],
  pausedUntil,
  hasSchedule,
}: {
  classId: number;
  stage: string;
  siblingSlots?: string[];
  pausedUntil: string | null;
  /** Lớp đã có ngày/giờ cố định chưa. */
  hasSchedule: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(classStage(stage).value);
  const [value, setValue] = useState(saved);
  const [until, setUntil] = useState(pausedUntil ?? "");
  // Ngày cụ thể của buổi đầu tiên — thứ trong tuần tự suy ra từ ngày này.
  const [date, setDate] = useState(() => toISODate(addDays(now(), 1)));
  const [time, setTime] = useState("");
  const info = classStage(value);

  // Chỉ lớp chưa có lịch mà được cho học lại mới phải xếp lịch; lớp đã có lịch
  // thì bật lại là chạy tiếp như cũ.
  const needsSchedule = !hasSchedule && !info.paused && info.status === "active";

  function commit(
    nextStage: string,
    nextUntil: string,
    schedule: { dayOfWeek: number; startTime: string; startDate?: string } | null
  ) {
    startTransition(async () => {
      await setClassStageAction(classId, nextStage, nextUntil || null, schedule);
      setSaved(classStage(nextStage).value);
    });
  }

  function onPick(next: string) {
    const nextInfo = classStage(next);
    setValue(nextInfo.value);
    if (!nextInfo.paused) setUntil("");
    // Cần xếp lịch thì chờ bấm nút, còn lại lưu ngay cho nhanh tay.
    if (!hasSchedule && !nextInfo.paused && nextInfo.status === "active") return;
    commit(nextInfo.value, nextInfo.paused ? until : "", null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      <select
        value={value}
        disabled={pending}
        aria-label="Trạng thái lớp"
        onChange={(e) => onPick(e.target.value)}
        className={`${field} w-auto py-1.5`}
      >
        {CLASS_STAGES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {/* Màu hiện ở nhãn bên cạnh chứ không tô vào ô chọn: nền của <select>
          bị bg-white của class `field` đè, và nhiều trình duyệt (macOS, iOS)
          cũng không cho đổi màu nền select. */}
      <ClassStatusBadge stage={saved} />

      {siblingSlots.length > 0 && (
        <p className="basis-full text-right text-xs text-ink-500">
          Đổi trạng thái là đổi luôn {siblingSlots.length === 1 ? "buổi" : `${siblingSlots.length} buổi`} khác
          của khách: {siblingSlots.join(", ")}
        </p>
      )}

      {info.paused && (
        <label className="flex items-center gap-1.5 text-sm text-ink-600 whitespace-nowrap">
          Học lại từ
          <input
            type="date"
            value={until}
            disabled={pending}
            aria-label="Ngày dự kiến học lại"
            onChange={(e) => {
              setUntil(e.target.value);
              commit(value, e.target.value, null);
            }}
            className={`${field} w-auto py-1.5 tabular`}
          />
        </label>
      )}

      {needsSchedule && (
        <div className="basis-full flex flex-wrap items-end justify-end gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
          <p className="basis-full text-sm text-ink-700">
            Lớp này chưa có lịch cố định. Xếp ngày giờ học lại để giáo viên thấy lớp trong lịch
            tuần và điểm danh được.
          </p>
          <label className="text-sm text-ink-600">
            Ngày
            <input
              type="date"
              value={date}
              min={toISODate(now())}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Ngày học buổi đầu"
              className={`${field} w-auto py-1.5 ml-1.5 tabular`}
            />
            {date && (
              <span className="ml-1.5 text-xs text-ink-500">
                ({DAY_LABELS[new Date(`${date}T00:00:00`).getDay()]} hằng tuần)
              </span>
            )}
          </label>
          <label className="text-sm text-ink-600">
            Giờ
            <TimeSelect
              value={time}
              onChange={(e) => setTime(e.target.value)}
              aria-label="Giờ học lại"
              emptyLabel="Chọn giờ"
              className={`${field} w-auto py-1.5 ml-1.5`}
            />
          </label>
          <button
            type="button"
            disabled={pending || !time || !date}
            onClick={() =>
              commit(value, "", {
                dayOfWeek: new Date(`${date}T00:00:00`).getDay(),
                startTime: time,
                startDate: date,
              })
            }
            className={`${btn.primary} py-1.5 disabled:opacity-50`}
          >
            {pending ? "Đang lưu..." : "Xếp lịch & cho học lại"}
          </button>
        </div>
      )}
    </div>
  );
}
