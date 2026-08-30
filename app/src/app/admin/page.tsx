import Link from "next/link";
import { db } from "@/lib/db";
import { listClassesByDay, listAttendance } from "@/lib/queries";
import { formatTimeRange, todayISO } from "@/lib/format";
import { DAY_LABELS } from "@/lib/types";

function classEndMinutes(startTime: string, durationMinutes: number): number {
  const [h, m] = startTime.split(":").map(Number);
  return h * 60 + m + durationMinutes;
}

function StatCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const content = (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 transition">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function AdminDashboard() {
  const teacherStats = db
    .prepare("SELECT COUNT(*) as c FROM users WHERE role='teacher' AND active=1")
    .get() as { c: number };
  const classStats = db
    .prepare("SELECT COUNT(*) as c FROM classes WHERE status='active'")
    .get() as { c: number };
  const unassignedStats = db
    .prepare("SELECT COUNT(*) as c FROM classes WHERE status='active' AND teacher_id IS NULL")
    .get() as { c: number };

  const today = new Date();
  const dow = today.getDay();
  const todayStr = todayISO();
  const todaysClasses = listClassesByDay(dow);
  const todaysAttendance = listAttendance({ from: todayStr, to: todayStr });
  const markedClassIds = new Set(todaysAttendance.map((a) => a.class_id));
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Tổng quan</h1>
        <p className="text-slate-500 text-sm mt-1">
          Hôm nay là {DAY_LABELS[dow]}, {todayStr}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Giáo viên đang hoạt động" value={teacherStats.c} href="/admin/teachers" />
        <StatCard label="Lớp đang học" value={classStats.c} href="/admin/classes" />
        <StatCard
          label="Lớp chưa có giáo viên"
          value={unassignedStats.c}
          href="/admin/assign"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Lớp học hôm nay ({todaysClasses.length})</h2>
          <Link href="/admin/attendance" className="text-sm text-indigo-600 hover:underline">
            Xem toàn bộ điểm danh
          </Link>
        </div>
        {todaysClasses.length === 0 ? (
          <p className="text-sm text-slate-500 px-4 py-6 text-center">
            Không có lớp nào lịch học hôm nay.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {todaysClasses.map((c) => {
              const marked = markedClassIds.has(c.id);
              const overdue = !marked && nowMinutes > classEndMinutes(c.start_time, c.duration_minutes);
              return (
                <div
                  key={c.id}
                  className={`px-4 py-3 flex items-center justify-between text-sm ${overdue ? "bg-red-50" : ""}`}
                >
                  <div>
                    <p className="font-medium text-slate-900">{c.student_name}</p>
                    <p className="text-slate-500">
                      {formatTimeRange(c.start_time, c.duration_minutes)} ·{" "}
                      {c.teacher_name || "Chưa có GV"}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      marked
                        ? "bg-emerald-50 text-emerald-700"
                        : overdue
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {marked
                      ? "Đã điểm danh"
                      : overdue
                        ? "⚠ Quá giờ, chưa điểm danh"
                        : "Chưa điểm danh"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
