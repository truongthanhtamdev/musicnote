import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  annotateSchedule,
  getPackageProgressForClasses,
  listClassesForTeacher,
  listPlannedSessions,
  sessionNumberMap,
} from "@/lib/queries";
import { classStage, formatClassSchedule, personKey, shortDayLabel, teacherSees } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { toISODate, todayISO } from "@/lib/format";
import StudentList, { type StudentGroup, type StudentTab } from "./student-list";

/**
 * Danh sách học viên của giáo viên — một dòng mỗi khách (gộp các buổi trong
 * tuần của cùng khách, cùng môn), chia theo Đang học / Linh động / Tạm nghỉ /
 * Đã nghỉ. Lịch dạy chỉ hiện lớp đang chạy, nên khách Tạm OFF hay học linh
 * động trước đây giáo viên không có chỗ nào nhìn lại được.
 */
export default async function TeacherStudentsPage() {
  const session = await getSession();
  const teacherId = session!.userId;
  const classes = listClassesForTeacher(teacherId);
  const scheduled = new Map(annotateSchedule(classes).map((c) => [c.id, c]));
  const progressByPackage = getPackageProgressForClasses(classes);

  // Buổi gần nhất + số buổi giáo viên này đã dạy, theo từng lớp.
  const ids = classes.map((c) => c.id);
  const stats = new Map<number, { last: string | null; lastId: number | null; taught: number }>();
  if (ids.length) {
    const rows = db
      .prepare(
        `SELECT class_id,
                MAX(session_date) AS last,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS taught
           FROM attendance WHERE teacher_id = ? AND class_id IN (${ids.map(() => "?").join(",")})
          GROUP BY class_id`
      )
      .all(teacherId, ...ids) as { class_id: number; last: string | null; taught: number }[];
    for (const r of rows) {
      const lastRow = r.last
        ? (db
            .prepare("SELECT id FROM attendance WHERE class_id = ? AND session_date = ?")
            .get(r.class_id, r.last) as { id: number } | undefined)
        : undefined;
      stats.set(r.class_id, { last: r.last, lastId: lastRow?.id ?? null, taught: r.taught });
    }
  }
  const numbers = sessionNumberMap(ids);

  // Buổi học thử / buổi chính thức của từng lớp (mọi giáo viên) — để biết
  // khách nào mới chỉ học thử, giáo viên được tự gỡ lịch nếu khách không học tiếp.
  const trialStats = new Map<number, { trials: number; regular: number }>();
  if (ids.length) {
    const rows = db
      .prepare(
        `SELECT class_id,
                SUM(CASE WHEN is_trial = 1 AND status = 'completed' THEN 1 ELSE 0 END) AS trials,
                SUM(CASE WHEN is_trial = 0 AND (status = 'completed' OR counts_as_used = 1) THEN 1 ELSE 0 END) AS regular
           FROM attendance WHERE class_id IN (${ids.map(() => "?").join(",")})
          GROUP BY class_id`
      )
      .all(...ids) as { class_id: number; trials: number; regular: number }[];
    for (const r of rows) trialStats.set(r.class_id, { trials: r.trials, regular: r.regular });
  }
  const trialOnly = new Map<string, { trialStage: boolean; trials: number; regular: number }>();

  const groups = new Map<string, StudentGroup>();
  for (const raw of classes) {
    const key = `${personKey(raw)}|${raw.subject}`;
    const c = teacherSees(raw);
    const s = stats.get(c.id);
    const g =
      groups.get(key) ??
      ({
        key,
        name: c.student_name,
        realName: raw.student_name,
        subject: c.subject,
        tab: "ended",
        stage: c.stage,
        phone: c.student_phone,
        guardian: c.guardian_name,
        facebook: c.facebook_url,
        meetingUrl: c.meeting_url,
        messengerUrl: c.messenger_url ?? null,
        pausedUntil: null,
        progress: null,
        slots: [],
        lastDate: null,
        lastNumber: null,
        taught: 0,
        nextDate: null,
        editClassId: null,
        flexibleClassId: null,
        dropTrialClassId: null,
        historyClassId: c.id,
      } satisfies StudentGroup);

    const tab: StudentTab =
      c.status === "active" ? (c.schedule_type === "flexible" ? "flexible" : "active") : c.status === "paused" ? "paused" : "ended";
    g.slots.push({ label: formatClassSchedule(c), tab });
    // Trạng thái của cả khách lấy theo buổi "sống" nhất.
    const rank: Record<StudentTab, number> = { active: 3, flexible: 2, paused: 1, ended: 0 };
    if (rank[tab] > rank[g.tab]) {
      g.tab = tab;
      g.stage = c.stage;
    }
    if (c.status === "paused" && c.paused_until) g.pausedUntil = c.paused_until;
    g.phone ||= c.student_phone;
    g.guardian ||= c.guardian_name;
    g.facebook ||= c.facebook_url;
    g.meetingUrl ||= c.meeting_url;
    g.messengerUrl ||= c.messenger_url ?? null;
    if (c.status === "active" && !g.editClassId) g.editClassId = c.id;
    if (tab === "flexible" && !g.flexibleClassId) g.flexibleClassId = c.id;
    if (c.status === "active") {
      const t = trialOnly.get(key) ?? { trialStage: false, trials: 0, regular: 0 };
      const ts = trialStats.get(c.id);
      t.trialStage ||= c.stage === "trial" || c.stage === "trial_awaiting_fee";
      t.trials += ts?.trials ?? 0;
      t.regular += ts?.regular ?? 0;
      trialOnly.set(key, t);
      if ((t.trialStage || (t.trials > 0 && t.regular === 0)) && !g.dropTrialClassId) g.dropTrialClassId = c.id;
      if (!t.trialStage && t.regular > 0) g.dropTrialClassId = null;
    }
    if (c.package_id && !g.progress) {
      const p = progressByPackage.get(c.package_id);
      if (p) g.progress = { used: p.used, total: p.total, remaining: p.remaining };
    }
    if (s) {
      g.taught += s.taught;
      if (s.last && (!g.lastDate || s.last > g.lastDate)) {
        g.lastDate = s.last;
        g.lastNumber = s.lastId != null ? (numbers.get(s.lastId) ?? null) : null;
        g.historyClassId = c.id;
      }
    }
    const next = scheduled.get(c.id)?.nextSessionDate;
    if (tab === "active" && next && (!g.nextDate || next < g.nextDate)) g.nextDate = next;
    groups.set(key, g);
  }

  // Buổi hẹn của lớp linh động: từ đầu tháng này tới hết tháng sau.
  const today = todayISO();
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonth = new Date(`${monthStart}T00:00:00`);
  nextMonth.setMonth(nextMonth.getMonth() + 2, 0);
  const rangeEnd = toISODate(nextMonth);

  const list = [...groups.values()]
    .map((g) => ({
      ...g,
      planned: g.flexibleClassId ? listPlannedSessions(g.flexibleClassId, monthStart, rangeEnd) : [],
      stageLabel: classStage(g.stage).label,
      stageClass: classStage(g.stage).className,
      lastLabel: g.lastDate ? shortDayLabel(g.lastDate) : null,
      nextLabel: g.nextDate ? shortDayLabel(g.nextDate) : null,
      pausedLabel: g.pausedUntil ? shortDayLabel(g.pausedUntil) : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Học viên của tôi"
        subtitle="Tất cả khách bạn đang dạy và đã dạy — kể cả khách học linh động, đang tạm nghỉ."
      />
      <StudentList students={list} today={today} />
    </div>
  );
}
