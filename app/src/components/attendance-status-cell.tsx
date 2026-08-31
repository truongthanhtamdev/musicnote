import { ATTENDANCE_STATUS_LABELS, hasRescheduleInfo, type AttendanceRow } from "@/lib/types";

/** Status label + trial badge + agreed makeup date/time, shared by every attendance list/table. */
export function AttendanceStatusCell({
  row,
}: {
  row: Pick<AttendanceRow, "status" | "is_trial" | "rescheduled_to_date" | "rescheduled_to_time">;
}) {
  return (
    <>
      {ATTENDANCE_STATUS_LABELS[row.status]}
      {!!row.is_trial && (
        <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">
          Thử
        </span>
      )}
      {hasRescheduleInfo(row.status) && row.rescheduled_to_date && (
        <span className="block text-xs text-slate-500">
          → {row.rescheduled_to_date}
          {row.rescheduled_to_time ? ` ${row.rescheduled_to_time}` : ""}
        </span>
      )}
    </>
  );
}
