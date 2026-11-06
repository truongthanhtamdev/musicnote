"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignTeacherAction } from "@/actions/classes";
import DeleteClassButton from "../delete-class-button";
import ClassStagePicker from "./stage-picker";

interface TeacherOption {
  id: number;
  name: string;
  available: boolean;
}

export default function ClassActions({
  classId,
  stage,
  siblingSlots,
  pausedUntil,
  hasSchedule,
  teacherId,
  teachers,
  canDelete,
  canOpenAssign = false,
}: {
  classId: number;
  stage: string;
  /** Các buổi khác trong tuần của khách — đổi trạng thái là đổi cả những buổi này. */
  siblingSlots: string[];
  pausedUntil: string | null;
  hasSchedule: boolean;
  teacherId: number | null;
  teachers: TeacherOption[];
  canDelete: boolean;
  /** Quản lý: bỏ giáo viên xong mở luôn trang Giao lớp để chọn người mới. */
  canOpenAssign?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <select
        // Đổi key khi giáo viên đổi để ô chọn hiện đúng người sau khi lưu.
        key={teacherId ?? "none"}
        defaultValue={teacherId ?? ""}
        disabled={isPending}
        onChange={(e) =>
          startTransition(() =>
            assignTeacherAction(classId, e.target.value ? Number(e.target.value) : null)
          )
        }
        className="rounded-xl border border-navy-200 px-2 py-1.5 text-sm"
      >
        <option value="">Chưa xếp GV</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} {t.available ? "" : "(bận giờ này)"}
          </option>
        ))}
      </select>
      {teacherId && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!window.confirm("Bỏ giáo viên hiện tại và đưa lớp về danh sách chờ giao lớp?")) return;
            startTransition(async () => {
              await assignTeacherAction(classId, null);
              if (canOpenAssign) router.push("/admin/assign");
              else router.refresh();
            });
          }}
          className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
        >
          Đưa về chờ giao lớp
        </button>
      )}

      <ClassStagePicker
        classId={classId}
        stage={stage}
        siblingSlots={siblingSlots}
        pausedUntil={pausedUntil}
        hasSchedule={hasSchedule}
      />
      {canDelete && <DeleteClassButton classId={classId} redirectTo="/admin/classes" />}
    </div>
  );
}
