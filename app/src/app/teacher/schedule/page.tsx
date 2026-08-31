import { getSession } from "@/lib/auth";
import { listClassesForTeacher } from "@/lib/queries";
import { DAY_LABELS, DAY_ORDER } from "@/lib/types";
import NewClassForm from "./new-class-form";
import TeacherClassRow from "./class-row";

export default async function TeacherSchedulePage() {
  const session = await getSession();
  const classes = listClassesForTeacher(session!.userId).filter((c) => c.status === "active");
  const flexibleClasses = classes.filter((c) => c.schedule_type === "flexible");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Lịch dạy trong tuần</h1>
        <p className="text-slate-500 text-sm mt-1">
          Bạn đang có {classes.length} lớp. Có học sinh mới? Thêm lớp ngay bên dưới — hệ thống sẽ
          tự gán lớp đó cho bạn.
        </p>
      </div>

      <NewClassForm />

      {flexibleClasses.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900 mb-2">
            Linh động (không có lịch cố định)
          </h2>
          <p className="text-xs text-slate-500 mb-2">
            Điểm danh các lớp này qua &quot;Lịch sử điểm danh → + Điểm danh buổi học bù&quot; mỗi
            khi có buổi học thực tế.
          </p>
          <ul className="divide-y divide-slate-100">
            {flexibleClasses.map((c) => (
              <TeacherClassRow key={c.id} cls={c} />
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {DAY_ORDER.map((d) => {
          const dayClasses = classes.filter((c) => c.day_of_week === d);
          return (
            <div key={d} className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-2">{DAY_LABELS[d]}</h2>
              {dayClasses.length === 0 ? (
                <p className="text-sm text-slate-400">Không có lớp</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {dayClasses.map((c) => (
                    <TeacherClassRow key={c.id} cls={c} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
