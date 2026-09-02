import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { annotateSchedule, getPackageProgress, listClasses, listTeachers } from "@/lib/queries";
import { PACKAGE_OPTIONS, SUBJECT_SUGGESTIONS, formatClassSchedule } from "@/lib/types";
import { IconPackage, IconSearch, SubjectIcon } from "@/components/icons";
import {
  Avatar,
  Card,
  DetailLink,
  EmptyState,
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

const PAGE_SIZE = 10;

type SP = {
  q?: string;
  subject?: string;
  teacherId?: string;
  pkg?: string;
  remaining?: string;
  page?: string;
};

/** Đường dẫn giữ nguyên các bộ lọc khác, chỉ đổi một tham số (dùng cho filter chip). */
function urlWith(sp: SP, key: keyof SP, value: string | null): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "page") params.set(k, String(v));
  }
  if (value === null) params.delete(key);
  else params.set(key, value);
  const qs = params.toString();
  return qs ? `/admin/packages?${qs}` : "/admin/packages";
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium rounded-full border px-3.5 py-1.5 whitespace-nowrap transition ${
        active
          ? "border-wood-400 bg-wood-50 text-wood-700"
          : "border-navy-200 bg-white text-ink-600 hover:border-navy-300"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function PackagesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const teachers = listTeachers(true);

  const all = annotateSchedule(listClasses())
    .flatMap((c) => {
      const progress = getPackageProgress(c);
      return progress ? [{ cls: c, progress }] : [];
    })
    .sort((a, b) => a.progress.remaining - b.progress.remaining);

  const q = (sp.q || "").trim().toLowerCase();
  const filtered = all.filter(({ cls, progress }) => {
    if (q && !cls.student_name.toLowerCase().includes(q)) return false;
    if (sp.subject && cls.subject !== sp.subject) return false;
    if (sp.teacherId && String(cls.teacher_id ?? "") !== sp.teacherId) return false;
    if (sp.pkg && String(progress.total) !== sp.pkg) return false;
    if (sp.remaining && progress.remaining > Number(sp.remaining)) return false;
    return true;
  });

  const page = Math.max(1, Number(sp.page || 1));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilter = Boolean(sp.q || sp.subject || sp.teacherId || sp.pkg || sp.remaining);
  const endingSoon = all.filter((r) => r.progress.remaining <= 5).length;
  const critical = all.filter((r) => r.progress.remaining <= 3).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Học viên & gói học"
        subtitle="Theo dõi tiến độ 20/50/100 tiết của từng học viên và nhắc gia hạn đúng lúc."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Gói đang theo dõi"
          value={all.length}
          unit="lớp"
          icon={<IconPackage className="w-5 h-5" />}
        />
        <MetricCard
          label="Sắp hết khóa"
          value={endingSoon}
          unit="lớp"
          hint="Còn 5 tiết trở xuống"
          tone="amber"
          icon={<IconPackage className="w-5 h-5" />}
        />
        <MetricCard
          label="Cần gia hạn gấp"
          value={critical}
          unit="lớp"
          hint="Còn 3 tiết trở xuống"
          tone="coral"
          icon={<IconPackage className="w-5 h-5" />}
        />
        <MetricCard
          label="Tổng tiết đã dạy"
          value={all.reduce((s, r) => s + r.progress.used, 0)}
          unit="tiết"
          tone="mint"
          icon={<IconPackage className="w-5 h-5" />}
        />
      </div>

      <Card padded={false}>
        {/* Bộ lọc */}
        <div className="p-4 border-b border-navy-100 space-y-3">
          <form className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                name="q"
                defaultValue={sp.q || ""}
                placeholder="Tìm kiếm học viên..."
                className={`${field} pl-9`}
                aria-label="Tìm kiếm học viên"
              />
            </div>
            <select
              name="subject"
              defaultValue={sp.subject || ""}
              className={`${field} w-auto`}
              aria-label="Lọc theo bộ môn"
            >
              <option value="">Tất cả bộ môn</option>
              {SUBJECT_SUGGESTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
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
          </form>

          <div className="flex flex-wrap gap-2 items-center">
            {PACKAGE_OPTIONS.map((n) => (
              <Chip
                key={n}
                href={urlWith(sp, "pkg", sp.pkg === String(n) ? null : String(n))}
                active={sp.pkg === String(n)}
              >
                Gói {n}
              </Chip>
            ))}
            <span className="w-px h-5 bg-navy-100" aria-hidden="true" />
            {["5", "3", "1"].map((n) => (
              <Chip
                key={n}
                href={urlWith(sp, "remaining", sp.remaining === n ? null : n)}
                active={sp.remaining === n}
              >
                Còn ≤ {n} tiết
              </Chip>
            ))}
            {hasFilter && (
              <Link href="/admin/packages" className={`${btn.ghost} text-coral-600`}>
                Xoá lọc
              </Link>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<IconPackage className="w-6 h-6" />}
            title="Không có gói học nào khớp bộ lọc"
            description="Thử bỏ bớt điều kiện lọc hoặc kiểm tra lại từ khoá tìm kiếm."
            action={
              hasFilter ? (
                <Link href="/admin/packages" className={btn.secondary}>
                  Xoá bộ lọc
                </Link>
              ) : undefined
            }
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Học viên</Th>
                <Th>Bộ môn</Th>
                <Th>Giáo viên</Th>
                <Th>Gói học</Th>
                <Th className="text-right">Đã học</Th>
                <Th className="text-right">Còn lại</Th>
                <Th>Tiến độ</Th>
                <Th>Trạng thái</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {rows.map(({ cls, progress }) => {
                const tone = packageTone(progress.remaining);
                return (
                  <tr
                    key={cls.id}
                    className={tone === "coral" ? "bg-coral-50/40" : "hover:bg-ivory-50"}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={cls.student_name} className="w-8 h-8 text-[11px]" />
                        <div className="min-w-0">
                          <p className="font-medium text-ink-900 truncate">{cls.student_name}</p>
                          <p className="text-xs text-ink-400 tabular">
                            {formatClassSchedule(cls)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      <span className="flex items-center gap-1.5">
                        <SubjectIcon subject={cls.subject} className="w-4 h-4 text-wood-500" />
                        {cls.subject}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      {cls.teacher_name || <span className="text-amber-700">Chưa xếp GV</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-700 tabular whitespace-nowrap">
                      Gói {progress.total} tiết
                    </td>
                    <td className="px-4 py-3 text-right tabular text-ink-900 font-medium">
                      {progress.used}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular font-semibold ${
                        tone === "coral"
                          ? "text-coral-600"
                          : tone === "amber"
                            ? "text-amber-700"
                            : "text-ink-900"
                      }`}
                    >
                      {progress.remaining}
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <ProgressBar
                        value={progress.used}
                        max={progress.total}
                        tone={tone}
                        showPercent
                      />
                    </td>
                    <td className="px-4 py-3">
                      {progress.remaining === 0 ? (
                        <StatusChip tone="coral">Hết gói</StatusChip>
                      ) : progress.remaining <= 5 ? (
                        <StatusChip tone={tone}>Sắp hết gói</StatusChip>
                      ) : (
                        <StatusChip tone="mint">Bình thường</StatusChip>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DetailLink href={`/admin/classes/${cls.id}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}

        {/* Phân trang */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-navy-100 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
            <span className="tabular">
              Hiển thị {(page - 1) * PAGE_SIZE + 1} – {Math.min(page * PAGE_SIZE, filtered.length)}{" "}
              của {filtered.length} lớp
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`${urlWith(sp, "page", String(p))}`}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-medium tabular ${
                      p === page
                        ? "bg-navy-800 text-white"
                        : "text-ink-600 hover:bg-ivory-100 border border-navy-100"
                    }`}
                  >
                    {p}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
