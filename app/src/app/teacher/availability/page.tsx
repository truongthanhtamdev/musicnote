import { getSession } from "@/lib/auth";
import { listBusySlots, listClassesForTeacher } from "@/lib/queries";
import { TeacherScheduleGrid } from "@/components/teacher-schedule-grid";

export default async function TeacherAvailabilityPage() {
  const session = await getSession();
  const busySlots = listBusySlots(session!.userId);
  const classes = listClassesForTeacher(session!.userId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Lịch của tôi</h1>
        <p className="text-slate-500 text-sm mt-1">
          Mặc định mọi khung giờ đều rảnh — bấm vào ô để đánh dấu khung giờ bạn bận (không nhận
          lớp được). Ô vàng là lớp đang dạy.
        </p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <TeacherScheduleGrid
          teacherId={session!.userId}
          classes={classes}
          busySlots={busySlots}
          mode="self"
        />
      </div>
    </div>
  );
}
