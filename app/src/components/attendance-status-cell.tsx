import { ATTENDANCE_STATUS_LABELS, hasRescheduleInfo, type AttendanceRow } from "@/lib/types";
import { StatusChip, type ChipTone } from "./ui";
import { IconAlert, IconCheckCircle } from "./icons";

const STATUS_TONE: Record<string, ChipTone> = {
  completed: "mint",
  teacher_absent: "coral",
  student_absent: "amber",
  rescheduled: "navy",
};

/** Status label + trial badge + agreed makeup date/time, shared by every attendance list/table. */
export function AttendanceStatusCell({
  row,
}: {
  row: Pick<AttendanceRow, "status" | "is_trial" | "rescheduled_to_date" | "rescheduled_to_time">;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusChip
        tone={STATUS_TONE[row.status] ?? "neutral"}
        icon={
          row.status === "completed" ? (
            <IconCheckCircle className="w-3.5 h-3.5" />
          ) : (
            <IconAlert className="w-3.5 h-3.5" />
          )
        }
      >
        {ATTENDANCE_STATUS_LABELS[row.status]}
      </StatusChip>

      {!!row.is_trial && <StatusChip tone="wood">Buổi học thử</StatusChip>}

      {hasRescheduleInfo(row.status) && row.rescheduled_to_date && (
        <span className="basis-full text-xs text-ink-500 tabular">
          → {row.rescheduled_to_date}
          {row.rescheduled_to_time ? ` ${row.rescheduled_to_time}` : ""}
        </span>
      )}
    </div>
  );
}
