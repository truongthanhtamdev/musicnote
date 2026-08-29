import { getSession } from "@/lib/auth";
import { listAvailability } from "@/lib/queries";
import { AvailabilityGrid } from "@/components/availability-grid";

export default async function TeacherAvailabilityPage() {
  const session = await getSession();
  const slots = listAvailability(session!.userId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Khung giờ rảnh</h1>
        <p className="text-slate-500 text-sm mt-1">
          Bấm vào ô để bật/tắt khung giờ bạn có thể nhận lớp. Trung tâm sẽ dựa vào đây để xếp lớp
          phù hợp cho bạn.
        </p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <AvailabilityGrid slots={slots} interactive />
      </div>
    </div>
  );
}
