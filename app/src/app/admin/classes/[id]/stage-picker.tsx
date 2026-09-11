"use client";

import { useState, useTransition } from "react";
import { setClassStageAction } from "@/actions/classes";
import { CLASS_STAGES, classStage } from "@/lib/types";
import { field } from "@/components/ui";
import ClassStatusBadge from "../status-badge";

/**
 * Chọn trạng thái lớp theo bảng màu trung tâm. Chọn một trạng thái Tạm OFF thì
 * hiện thêm ô ngày học lại — lưu luôn cùng lúc, khỏi phải bấm hai lần.
 */
export default function ClassStagePicker({
  classId,
  stage,
  pausedUntil,
}: {
  classId: number;
  stage: string;
  pausedUntil: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(classStage(stage).value);
  const [until, setUntil] = useState(pausedUntil ?? "");
  const info = classStage(value);

  const save = (nextStage: string, nextUntil: string) =>
    startTransition(() => setClassStageAction(classId, nextStage, nextUntil || null));

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      <select
        value={value}
        disabled={pending}
        aria-label="Trạng thái lớp"
        onChange={(e) => {
          const next = classStage(e.target.value);
          setValue(next.value);
          if (!next.paused) setUntil("");
          save(next.value, next.paused ? until : "");
        }}
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
      <ClassStatusBadge stage={info.value} />

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
              save(value, e.target.value);
            }}
            className={`${field} w-auto py-1.5 tabular`}
          />
        </label>
      )}
    </div>
  );
}
