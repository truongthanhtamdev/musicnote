import { getSession } from "@/lib/auth";
import { listBusySlots, listClassesForTeacher } from "@/lib/queries";
import { TeacherScheduleGrid } from "@/components/teacher-schedule-grid";
import { Card, PageHeader } from "@/components/ui";

export default async function TeacherAvailabilityPage() {
  const session = await getSession();
  const busySlots = listBusySlots(session!.userId);
  const classes = listClassesForTeacher(session!.userId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lịch tuần của tôi"
        subtitle="Mặc định mọi khung giờ đều rảnh — bấm vào ô để đánh dấu khung giờ bạn bận (không nhận lớp được). Ô màu gỗ là lớp đang dạy."
      />
      <Card padded={false}>
        <div className="p-2.5 sm:p-5">
        <TeacherScheduleGrid
          teacherId={session!.userId}
          classes={classes}
          busySlots={busySlots}
          mode="self"
        />
        </div>
      </Card>
    </div>
  );
}
