import { requireRole } from "@/lib/guard";
import { ADMIN_AREA_ROLES, formatClassSchedule } from "@/lib/types";
import { db } from "@/lib/db";
import { listTeachers } from "@/lib/queries";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import NewClassForm from "../classes/new-class-form";
import { trialPrefill } from "../classes/trial-prefill";

/**
 * Trang tạo lớp cho nhân viên đặt hẹn.
 *
 * Chỉ có form tạo lớp và danh sách lớp CHÍNH NGƯỜI NÀY vừa tạo — không có
 * danh sách lớp đang học của trung tâm. Người tạo tự được ghi làm người phụ
 * trách, nên thưởng học thử và chốt lớp của khách này về đúng họ.
 */
export default async function CreateClassPage({
  searchParams,
}: {
  searchParams: Promise<{ trial?: string }>;
}) {
  const session = await requireRole(ADMIN_AREA_ROLES);
  const sp = await searchParams;
  const teachers = listTeachers(false);
  const prefill = trialPrefill(sp.trial);

  const mine = db
    .prepare(
      `SELECT c.*, u.name AS teacher_name FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       WHERE c.coordinator_id = ?
       ORDER BY c.created_at DESC, c.id DESC LIMIT 15`
    )
    .all(session.userId) as (import("@/lib/types").ClassRow & { teacher_name: string | null })[];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tạo lớp học"
        subtitle="Tạo lớp cho khách vừa chốt lịch. Bạn được ghi là người phụ trách, nên thưởng học thử và chốt lớp của khách này tự về bạn."
        action={<NewClassForm teachers={teachers} prefill={prefill} />}
      />

      <Card padded={false}>
        <CardHeader title="Lớp bạn tạo gần đây" count={mine.length} />
        {mine.length === 0 ? (
          <EmptyState title="Chưa có lớp nào" description="Lớp bạn tạo sẽ hiện ở đây để đối chiếu." />
        ) : (
          <ul className="divide-y divide-navy-100">
            {mine.map((c) => (
              <li key={c.id} className="px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium text-ink-900">{c.student_name}</span>
                <span className="text-ink-500">{c.subject}</span>
                <span className="text-ink-500 tabular">{formatClassSchedule(c)}</span>
                <span className={c.teacher_name ? "text-ink-600" : "text-amber-700"}>
                  {c.teacher_name ?? "chưa có giáo viên"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
