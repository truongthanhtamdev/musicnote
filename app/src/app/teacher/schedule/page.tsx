import { getSession } from "@/lib/auth";
import { listClassesForTeacher, getPackageProgressForClasses } from "@/lib/queries";
import { DAY_LABELS, DAY_ORDER } from "@/lib/types";
import { IconClasses, IconClock } from "@/components/icons";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import NewClassForm from "./new-class-form";
import TeacherClassRow from "./class-row";

export default async function TeacherSchedulePage() {
  const session = await getSession();
  const activeClasses = listClassesForTeacher(session!.userId).filter((c) => c.status === "active");
  const progressByPackage = getPackageProgressForClasses(activeClasses);
  const classes = activeClasses.map((c) => ({
    ...c,
    progress: c.package_id ? (progressByPackage.get(c.package_id) ?? null) : null,
  }));
  const flexibleClasses = classes.filter((c) => c.schedule_type === "flexible");
  const todayDow = new Date().getDay();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lịch dạy trong tuần"
        subtitle={`Bạn đang có ${classes.length} lớp. Có học viên mới? Thêm lớp — hệ thống sẽ tự gán lớp đó cho bạn.`}
        action={<NewClassForm />}
      />

      {classes.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<IconClasses className="w-7 h-7" />}
            title="Chưa có lớp nào trong tuần"
            description="Thêm lớp đầu tiên để bắt đầu theo dõi lịch dạy và điểm danh."
            action={<NewClassForm />}
          />
        </Card>
      ) : (
        <>
          {flexibleClasses.length > 0 && (
            <Card padded={false}>
              <CardHeader
                title="Lớp linh động"
                count={flexibleClasses.length}
                icon={<IconClock className="w-4.5 h-4.5 text-wood-500" />}
              />
              <p className="px-5 pt-3 text-xs text-ink-500">
                Không có lịch cố định — điểm danh qua &quot;Lịch sử điểm danh → Điểm danh buổi học
                bù&quot; mỗi khi có buổi học thực tế.
              </p>
              <ul className="divide-y divide-navy-100 mt-1">
                {flexibleClasses.map((c) => (
                  <TeacherClassRow key={c.id} cls={c} progress={c.progress} />
                ))}
              </ul>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {DAY_ORDER.map((d) => {
              const dayClasses = classes
                .filter((c) => c.day_of_week === d)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));
              const isToday = d === todayDow;
              return (
                <Card
                  key={d}
                  padded={false}
                  className={isToday ? "border-wood-300 ring-1 ring-wood-200" : ""}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-navy-100">
                    <h2 className="font-semibold text-ink-900 flex items-center gap-2">
                      {DAY_LABELS[d]}
                      {isToday && (
                        <span className="text-[11px] font-bold uppercase tracking-wide text-wood-700 bg-wood-50 border border-wood-100 rounded-full px-2 py-0.5">
                          Hôm nay
                        </span>
                      )}
                    </h2>
                    <span className="text-xs text-ink-400 tabular">{dayClasses.length} lớp</span>
                  </div>
                  {dayClasses.length === 0 ? (
                    <p className="text-sm text-ink-400 px-4 py-5 text-center">Không có lớp</p>
                  ) : (
                    <ul className="divide-y divide-navy-100">
                      {dayClasses.map((c) => (
                        <TeacherClassRow key={c.id} cls={c} progress={c.progress} />
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
