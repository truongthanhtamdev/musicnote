import { listMissedCheckins, getPackageProgressForClasses } from "@/lib/queries";
import { formatTimeRange } from "@/lib/format";
import { DAY_LABELS } from "@/lib/types";
import type { MissedRow } from "./missed-checkin-panel";

/** Buổi giáo viên còn nợ điểm danh, đã định dạng sẵn cho MissedCheckinPanel. */
export function missedRowsForTeacher(teacherId: number): MissedRow[] {
  const missed = listMissedCheckins({ teacherId });
  if (missed.length === 0) return [];

  const progressByPackage = getPackageProgressForClasses(missed.map((m) => m.cls));

  return missed.map((m) => {
    const [, month, day] = m.date.split("-");
    const used = m.cls.package_id ? progressByPackage.get(m.cls.package_id)?.used : undefined;
    return {
      classId: m.cls.id,
      studentName: m.cls.student_name,
      subject: m.cls.subject,
      date: m.date,
      dayLabel: `${DAY_LABELS[new Date(`${m.date}T00:00:00`).getDay()]} ${day}/${month}`,
      timeRange: formatTimeRange(m.cls.start_time, m.cls.duration_minutes),
      daysLate: m.daysLate,
      sessionNumber: m.cls.trial_pending ? 0 : used !== undefined ? used + 1 : undefined,
    };
  });
}
