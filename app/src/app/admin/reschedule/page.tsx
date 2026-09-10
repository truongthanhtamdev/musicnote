import { requireRole } from "@/lib/guard";
import { listRescheduleRequests } from "@/lib/queries";
import { IconCalendarCheck } from "@/components/icons";
import { Card, EmptyState, PageHeader, TableShell, Th } from "@/components/ui";
import RescheduleRow from "@/components/reschedule-row";

export default async function AdminReschedulePage() {
  await requireRole(["admin", "coordinator"]);
  const requests = listRescheduleRequests({ limit: 200 });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Yêu cầu dời lịch"
        subtitle="Học viên tự xin dời buổi trên trang của mình, chỉ chọn được khung giáo viên còn trống. Duyệt xong buổi gốc tự chuyển thành 'Dời lịch' kèm giờ học bù."
      />

      <Card padded={false}>
        {requests.length === 0 ? (
          <EmptyState
            icon={<IconCalendarCheck className="w-6 h-6" />}
            title="Chưa có yêu cầu dời lịch nào"
            description="Học viên bấm 'Xin dời buổi này' trong trang học viên sẽ hiện ở đây."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Học viên</Th>
                <Th>Buổi gốc</Th>
                <Th>Xin dời sang</Th>
                <Th>Lý do</Th>
                <Th>Trạng thái</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {requests.map((r) => (
                <RescheduleRow key={r.id} request={r} />
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
