import Link from "next/link";
import { requireRole } from "@/lib/guard";
import {
  listRatings,
  listTeachers,
  ratingSummary,
  ratingsByTeacher,
} from "@/lib/queries";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/format";
import { IconAlert, IconChat, IconFilter, IconUsers } from "@/components/icons";
import {
  Banner,
  Card,
  CardHeader,
  EmptyState,
  MetricCard,
  PageHeader,
  TableShell,
  Th,
  btn,
  field,
  label,
} from "@/components/ui";
import { TeacherStars } from "@/components/teacher-stars";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-600 whitespace-nowrap" aria-label={`${n} trên 5 sao`}>
      {"★".repeat(n)}
      <span className="text-ink-200">{"★".repeat(5 - n)}</span>
    </span>
  );
}

/**
 * Khách chấm sao từng buổi học, nhưng trước đây chỉ chính giáo viên đó đọc
 * được nhận xét của khách về mình — chủ trung tâm không thấy gì. Trang này là
 * chỗ đọc: điểm từng giáo viên, và toàn bộ nhận xét, ưu tiên những buổi bị
 * chấm thấp vì đó là khách sắp nghỉ mà chưa nói ra.
 */
export default async function RatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; low?: string }>;
}) {
  await requireRole(["admin", "coordinator"]);
  const sp = await searchParams;
  const from = sp.from || firstDayOfMonth();
  const to = sp.to || lastDayOfMonth();
  const lowOnly = sp.low === "1";

  const summary = ratingSummary(from, to);
  const byTeacher = ratingsByTeacher(from, to);
  // Lấy cả giáo viên đã ngừng hoạt động: người vừa nghỉ việc chính là người
  // hay cần xem lại điểm nhất, mà bỏ họ ra thì tổng số lượt chấm ở trên lại
  // không khớp với bảng bên dưới.
  const teachers = listTeachers(true)
    .map((t) => ({ teacher: t, rating: byTeacher.get(t.id) }))
    .filter((r) => r.rating)
    .sort((a, b) => (b.rating?.average ?? 0) - (a.rating?.average ?? 0));
  const ratings = listRatings({ from, to, maxStars: lowOnly ? 2 : undefined });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Khách đánh giá"
        subtitle="Điểm sao và nhận xét khách gửi sau mỗi buổi học. Link chấm sao nằm ở trang Lịch & điểm danh, cột Đánh giá."
      />

      <Card>
        <form className="flex flex-wrap gap-3 items-end">
          <div>
            <label className={label} htmlFor="r-from">
              Từ ngày
            </label>
            <input
              id="r-from"
              type="date"
              name="from"
              defaultValue={from}
              className={`${field} w-auto`}
            />
          </div>
          <div>
            <label className={label} htmlFor="r-to">
              Đến ngày
            </label>
            <input id="r-to" type="date" name="to" defaultValue={to} className={`${field} w-auto`} />
          </div>
          {lowOnly && <input type="hidden" name="low" value="1" />}
          <button type="submit" className={btn.primary}>
            <IconFilter className="w-4 h-4" />
            Xem
          </button>
        </form>
      </Card>

      {summary.low > 0 && (
        <Banner
          tone="coral"
          icon={<IconAlert className="w-5 h-5" />}
          title={`${summary.low} buổi bị chấm 1–2 sao`}
          action={
            <Link
              href={`/admin/ratings?from=${from}&to=${to}${lowOnly ? "" : "&low=1"}`}
              className={btn.secondary}
            >
              {lowOnly ? "Xem tất cả đánh giá" : "Xem riêng các buổi này"}
            </Link>
          }
        >
          Gọi cho khách sớm — phần lớn khách không phàn nàn, họ chỉ lặng lẽ nghỉ học.
        </Banner>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Sao trung bình"
          value={summary.count ? `★ ${summary.average.toFixed(1)}` : "–"}
          hint={summary.count ? `${summary.count} lượt chấm` : "Chưa có lượt nào"}
          tone="amber"
        />
        <MetricCard label="Buổi 1–2 sao" value={summary.low} unit="buổi" tone="coral" />
        <MetricCard
          label="Buổi đã dạy"
          value={summary.sessions}
          unit="buổi"
          tone="mint"
        />
        <MetricCard
          label="Tỉ lệ khách chấm"
          // Chặn trên 100%: buổi bị xoá sau khi khách đã chấm thì số lượt chấm
          // có thể nhiều hơn số buổi còn lại, hiện "120%" nhìn như lỗi.
          value={
            summary.sessions
              ? `${Math.min(100, Math.round((summary.count / summary.sessions) * 100))}%`
              : "–"
          }
          hint="Gửi link chấm sao sau buổi học để tăng tỉ lệ"
          tone="navy"
        />
      </div>

      <Card padded={false}>
        <CardHeader
          title="Điểm từng giáo viên"
          count={teachers.length || undefined}
          icon={<IconUsers className="w-5 h-5 text-wood-500" />}
        />
        {teachers.length === 0 ? (
          <EmptyState
            icon={<IconUsers className="w-6 h-6" />}
            title="Chưa giáo viên nào được chấm trong khoảng này"
            description="Gửi link chấm sao cho khách sau buổi học để có dữ liệu."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Giáo viên</Th>
                <Th>Điểm khách chấm</Th>
                <Th className="text-right">Lượt chấm</Th>
                <Th className="text-right">Buổi 1–2 sao</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {teachers.map(({ teacher, rating }) => (
                <tr key={teacher.id} className="hover:bg-ivory-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink-900">{teacher.name}</span>
                    {!teacher.active && (
                      <span className="block text-xs text-ink-400">Đã ngừng hoạt động</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TeacherStars rating={rating} />
                  </td>
                  <td className="px-4 py-3 text-right tabular text-ink-700">{rating?.count}</td>
                  <td className="px-4 py-3 text-right tabular">
                    {rating?.low ? (
                      <span className="font-semibold text-coral-600">{rating.low}</span>
                    ) : (
                      <span className="text-ink-300">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/teachers/${teacher.id}`}
                      className="text-wood-600 hover:underline font-medium whitespace-nowrap"
                    >
                      Hồ sơ
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <Card padded={false}>
        <CardHeader
          title={lowOnly ? "Các buổi bị chấm thấp" : "Khách nói gì"}
          count={ratings.length || undefined}
          icon={<IconChat className="w-5 h-5 text-wood-500" />}
        />
        {ratings.length === 0 ? (
          <EmptyState
            icon={<IconChat className="w-6 h-6" />}
            title="Chưa có đánh giá nào trong khoảng này"
            description="Sau mỗi buổi, bấm “Chép link chấm sao” ở trang Lịch & điểm danh rồi gửi cho khách qua Zalo."
          />
        ) : (
          <ul className="divide-y divide-navy-100">
            {ratings.map((r) => (
              <li key={r.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <Stars n={r.stars} />
                  <span className="font-medium text-ink-900">{r.student_name}</span>
                  <span className="text-sm text-ink-500 tabular">
                    {r.subject} · {r.session_date} · GV {r.teacher_name || "—"}
                  </span>
                </div>
                {r.comment && <p className="text-sm text-ink-700 mt-1.5">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
