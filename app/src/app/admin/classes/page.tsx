import Link from "next/link";
import {
  listClasses,
  listTeachers,
  getPackageProgress,
  annotateSchedule,
  getTuitionStatusForClasses,
} from "@/lib/queries";
import { CLASS_STAGES, formatClassSchedule } from "@/lib/types";
import { formatVND } from "@/lib/format";
import { IconAlert, IconClasses, IconSearch, IconWallet, SubjectIcon } from "@/components/icons";
import {
  Avatar,
  Card,
  DetailLink,
  EmptyState,
  CustomerName,
  MetricCard,
  PageHeader,
  ProgressBar,
  StatusChip,
  TableShell,
  Th,
  btn,
  field,
  packageTone,
} from "@/components/ui";
import NewClassForm from "./new-class-form";
import ClassStatusBadge from "./status-badge";

type SP = { q?: string; status?: string; teacherId?: string; tuition?: string };

export default async function ClassesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const teachers = listTeachers(false);
  const all = annotateSchedule(listClasses());
  const tuition = getTuitionStatusForClasses(all);

  const q = (sp.q || "").trim().toLowerCase();
  const classes = all
    .filter((c) => {
      if (q && !c.student_name.toLowerCase().includes(q)) return false;
      // Bộ lọc nhận cả nhóm ("group:active") lẫn từng trạng thái chi tiết.
      if (sp.status?.startsWith("group:")) {
        if (c.status !== sp.status.slice(6)) return false;
      } else if (sp.status && c.stage !== sp.status) {
        return false;
      }
      if (sp.teacherId && String(c.teacher_id ?? "") !== sp.teacherId) return false;
      if (sp.tuition === "due" && !tuition.get(c.id)?.needsFollowUp) return false;
      return true;
    })
    // Lớp chưa thu đủ học phí đẩy lên đầu, trong nhóm đó lớp mới tạo (và lớp
    // đang chờ buổi học thử) lên trước — đó là những lớp cần gọi khách hàng
    // ngay. Còn lại giữ nguyên thứ tự theo lịch tuần.
    .sort((a, b) => {
      const aDue = tuition.get(a.id)?.needsFollowUp ? 1 : 0;
      const bDue = tuition.get(b.id)?.needsFollowUp ? 1 : 0;
      if (aDue !== bDue) return bDue - aDue;
      if (!aDue) return 0;
      if (a.trial_pending !== b.trial_pending) return b.trial_pending - a.trial_pending;
      return b.created_at.localeCompare(a.created_at);
    });

  const activeCount = all.filter((c) => c.status === "active").length;
  const missedCount = all.filter((c) => c.missedLastSession).length;
  const unassigned = all.filter((c) => c.status === "active" && !c.teacher_id).length;
  const dueCount = all.filter((c) => tuition.get(c.id)?.needsFollowUp).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lớp học"
        subtitle="Toàn bộ lớp theo lịch tuần, kèm tiến độ gói học và cảnh báo chưa điểm danh."
        action={<NewClassForm teachers={teachers} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard
          label="Tổng số lớp"
          value={all.length}
          unit="lớp"
          icon={<IconClasses className="w-5 h-5" />}
        />
        <MetricCard
          label="Đang học"
          value={activeCount}
          unit="lớp"
          tone="mint"
          icon={<IconClasses className="w-5 h-5" />}
        />
        <MetricCard
          label="Chưa xếp giáo viên"
          value={unassigned}
          unit="lớp"
          tone={unassigned ? "amber" : "navy"}
          href="/admin/assign"
          icon={<IconClasses className="w-5 h-5" />}
        />
        <MetricCard
          label="Chưa điểm danh buổi gần nhất"
          value={missedCount}
          unit="lớp"
          tone={missedCount ? "coral" : "navy"}
          icon={<IconAlert className="w-5 h-5" />}
        />
        <MetricCard
          label="Chưa thu đủ học phí"
          value={dueCount}
          unit="lớp"
          tone={dueCount ? "amber" : "navy"}
          href="/admin/classes?tuition=due"
          icon={<IconWallet className="w-5 h-5" />}
        />
      </div>

      <Card padded={false}>
        <form className="p-4 border-b border-navy-100 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              name="q"
              defaultValue={sp.q || ""}
              placeholder="Tìm học viên..."
              className={`${field} pl-9`}
              aria-label="Tìm học viên"
            />
          </div>
          <select
            name="status"
            defaultValue={sp.status || ""}
            className={`${field} w-auto`}
            aria-label="Lọc theo trạng thái"
          >
            <option value="">Tất cả trạng thái</option>
            <optgroup label="Nhóm">
              <option value="group:active">Đang chạy lịch</option>
              <option value="group:paused">Tạm dừng</option>
              <option value="group:ended">Đã kết thúc</option>
            </optgroup>
            <optgroup label="Chi tiết">
              {CLASS_STAGES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </optgroup>
          </select>
          <select
            name="teacherId"
            defaultValue={sp.teacherId || ""}
            className={`${field} w-auto`}
            aria-label="Lọc theo giáo viên"
          >
            <option value="">Tất cả giáo viên</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button type="submit" className={btn.primary}>
            Lọc
          </button>
          {(sp.q || sp.status || sp.teacherId || sp.tuition) && (
            <Link href="/admin/classes" className={`${btn.ghost} text-coral-600`}>
              Xoá lọc
            </Link>
          )}
        </form>

        {classes.length === 0 ? (
          <EmptyState
            icon={<IconClasses className="w-6 h-6" />}
            title="Chưa có lớp học nào"
            description="Thêm lớp mới hoặc bỏ bớt điều kiện lọc để xem danh sách."
            action={<NewClassForm teachers={teachers} />}
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Học viên</Th>
                <Th>Lớp học</Th>
                <Th>Buổi tiếp theo</Th>
                <Th>Gói học</Th>
                <Th>Giáo viên</Th>
                <Th>Trạng thái</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {classes.map((c) => {
                const progress = getPackageProgress(c);
                const owed = tuition.get(c.id);
                return (
                  <tr
                    key={c.id}
                    className={
                      c.missedLastSession
                        ? "bg-coral-50/40"
                        : owed?.needsFollowUp
                          ? "bg-amber-50/40"
                          : "hover:bg-ivory-50"
                    }
                  >
                    <td className="px-4 py-3">
                      {/* Chặn bề ngang: tên học viên dài (kèm "- USA") kéo cả
                          bảng rộng hơn thẻ, phần trạng thái bị đẩy khuất viền. */}
                      <div className="flex items-center gap-2.5 max-w-[230px]">
                        <Avatar name={c.student_name} className="w-8 h-8 text-[11px] shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-ink-900">
                            {c.student_name}
                            {c.language === "en" && (
                              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-navy-50 text-navy-700 align-middle">
                                EN
                              </span>
                            )}
                            {c.trial_pending === 1 && (
                              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-mint-50 text-mint-700 align-middle">
                                HỌC THỬ
                              </span>
                            )}
                          </p>
                          {(c.guardian_name || c.facebook_url) && (
                            <p className="text-xs text-ink-400 flex items-center gap-1 min-w-0">
                              <span className="shrink-0">KH:</span>
                              <CustomerName
                                name={c.guardian_name}
                                facebookUrl={c.facebook_url}
                                className="truncate"
                              />
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Bộ môn và lịch học gộp một cột: tách hai cột thì bảng
                        rộng hơn thẻ, cột trạng thái bị đẩy khuất ra ngoài viền. */}
                    <td className="px-4 py-3 text-ink-700">
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <SubjectIcon subject={c.subject} className="w-4 h-4 shrink-0 text-wood-500" />
                        {c.subject}
                        {c.level && <span className="text-xs text-ink-400">· {c.level}</span>}
                      </span>
                      <span className="block text-xs text-ink-500 tabular whitespace-nowrap">
                        {formatClassSchedule(c)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-ink-700 tabular">
                        {c.schedule_type === "flexible" ? "–" : c.nextSessionDate}
                      </span>
                      {c.missedLastSession && (
                        <span className="flex items-center gap-1 text-xs font-medium text-coral-600 mt-0.5">
                          <IconAlert className="w-3.5 h-3.5" />
                          Chưa điểm danh buổi {c.lastDueDate}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[130px]">
                      {progress ? (
                        <>
                          <span className="text-xs text-ink-500 tabular">
                            {progress.used}/{progress.total} tiết · còn {progress.remaining}
                          </span>
                          <ProgressBar
                            value={progress.used}
                            max={progress.total}
                            tone={packageTone(progress.remaining)}
                            className="mt-1"
                          />
                        </>
                      ) : (
                        <span className="text-ink-400">Không theo gói</span>
                      )}
                      {owed?.needsFollowUp && (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-700 mt-1">
                          <IconWallet className="w-3.5 h-3.5 shrink-0" />
                          {owed.paid === 0
                            ? "Chưa đóng học phí"
                            : `Còn thiếu ${formatVND(owed.outstanding)}`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-700 max-w-[150px]">
                      {c.teacher_name || <StatusChip tone="amber">Chưa xếp GV</StatusChip>}
                    </td>
                    <td className="px-4 py-3 max-w-[120px]">
                      <ClassStatusBadge stage={c.stage} wrap />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DetailLink href={`/admin/classes/${c.id}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}

        {classes.length > 0 && (
          <div className="px-4 py-3 border-t border-navy-100 text-sm text-ink-500 tabular">
            Hiển thị {classes.length} / {all.length} lớp
          </div>
        )}
      </Card>
    </div>
  );
}
