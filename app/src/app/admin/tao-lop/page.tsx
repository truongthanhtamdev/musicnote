import Link from "next/link";
import { isClassEditor, requireRole } from "@/lib/guard";
import { ADMIN_AREA_ROLES, MANAGE_ROLES, formatClassSchedule, type ClassRow } from "@/lib/types";
import { db } from "@/lib/db";
import { getUserById } from "@/lib/auth";
import { listTeachers } from "@/lib/queries";
import { localFromSqlUtc } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import NewClassForm from "../classes/new-class-form";
import { trialPrefill } from "../classes/trial-prefill";
import ClassStatusBadge from "../classes/status-badge";

/**
 * Trang tạo lớp cho nhân viên đặt hẹn.
 *
 * Có form tạo lớp và LỊCH SỬ mọi lớp chính người này đã tạo (ngày giờ tạo,
 * chia theo tháng) — không có danh sách lớp đang học của trung tâm. Người
 * tạo tự được ghi làm người phụ trách, nên thưởng học thử và chốt lớp của
 * khách này về đúng họ.
 *
 * Quản lý mở `?staff=<id>` (từ trang Nhân sự) để xem lịch sử của từng nhân
 * viên — đối chiếu số lớp họ báo với số lớp thật sự đã tạo.
 */
export default async function CreateClassPage({
  searchParams,
}: {
  searchParams: Promise<{ trial?: string; staff?: string }>;
}) {
  const session = await requireRole(ADMIN_AREA_ROLES);
  const sp = await searchParams;
  const teachers = listTeachers(false);
  const prefill = trialPrefill(sp.trial);
  // Được cấp quyền sửa lớp thì bấm vào lớp để sửa, lớp chưa có giáo viên
  // thì giao luôn — khỏi phải nhờ Quản lý.
  const canEdit = isClassEditor(session);

  // Chỉ Quản lý trở lên mới xem được lịch sử của người khác.
  const requested = Number(sp.staff) || 0;
  const viewing =
    requested && requested !== session.userId && MANAGE_ROLES.includes(session.role) ? getUserById(requested) : null;
  const ownerId = viewing?.id ?? session.userId;

  const rows = db
    .prepare(
      `SELECT c.*, u.name AS teacher_name FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       WHERE c.coordinator_id = ?
       ORDER BY c.created_at DESC, c.id DESC LIMIT 1000`
    )
    .all(ownerId) as (ClassRow & { teacher_name: string | null })[];

  // Chia theo tháng tạo (giờ Việt Nam), tháng mới nhất lên đầu.
  const months = new Map<string, { created: string; row: (typeof rows)[number] }[]>();
  for (const row of rows) {
    const created = localFromSqlUtc(row.created_at);
    const key = created.slice(0, 7);
    const list = months.get(key);
    if (list) list.push({ created, row });
    else months.set(key, [{ created, row }]);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={viewing ? `Lớp do ${viewing.name} tạo` : "Tạo lớp học"}
        subtitle={
          viewing
            ? "Lịch sử mọi lớp người này đã tạo, có ngày giờ tạo — để đối chiếu."
            : "Tạo lớp cho khách vừa chốt lịch. Bạn được ghi là người phụ trách, nên thưởng học thử và chốt lớp của khách này tự về bạn."
        }
        action={viewing ? undefined : <NewClassForm teachers={teachers} prefill={prefill} />}
      />

      <Card padded={false}>
        <CardHeader title={viewing ? "Lịch sử lớp đã tạo" : "Lịch sử lớp bạn đã tạo"} count={rows.length} />
        {rows.length === 0 ? (
          <EmptyState title="Chưa có lớp nào" description="Lớp tạo xong sẽ hiện ở đây kèm ngày giờ tạo để đối chiếu." />
        ) : (
          [...months.entries()].map(([month, list]) => (
            <section key={month}>
              <h3 className="px-5 py-2 bg-ivory-50 border-y border-navy-100 text-xs font-bold uppercase tracking-wide text-ink-500">
                Tháng {Number(month.slice(5))}/{month.slice(0, 4)} · {list.length} lớp
              </h3>
              <ul className="divide-y divide-navy-100">
                {list.map(({ created, row: c }) => (
                  <li key={c.id} className="px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm min-w-0">
                    <span className="text-xs text-ink-400 tabular w-full sm:w-auto" title="Ngày giờ tạo lớp">
                      {created.slice(8, 10)}/{created.slice(5, 7)} {created.slice(11, 16)}
                    </span>
                    {canEdit ? (
                      <Link
                        href={`/admin/classes/${c.id}`}
                        className="font-medium text-ink-900 hover:text-wood-700 hover:underline"
                      >
                        {c.student_name}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink-900">{c.student_name}</span>
                    )}
                    <span className="text-ink-500">{c.subject}</span>
                    <span className="text-ink-500 tabular">{formatClassSchedule(c)}</span>
                    <span className={c.teacher_name ? "text-ink-600" : "text-amber-700"}>
                      {c.teacher_name ?? "chưa có giáo viên"}
                    </span>
                    <ClassStatusBadge stage={c.stage} />
                    {canEdit && (
                      <span className="ml-auto flex items-center gap-2">
                        {!c.teacher_id && c.status === "active" && (
                          <Link
                            href="/admin/assign"
                            className="rounded-lg bg-wood-500 hover:bg-wood-600 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Giao giáo viên
                          </Link>
                        )}
                        <Link
                          href={`/admin/classes/${c.id}`}
                          className="rounded-lg border border-navy-200 px-3 py-1.5 text-xs font-semibold text-wood-700 hover:bg-ivory-100"
                        >
                          Sửa lớp
                        </Link>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </Card>
    </div>
  );
}
