import { requireRole } from "@/lib/guard";
import { listTrialRequests } from "@/lib/queries";
import { TRIAL_REQUEST_STATUS_LABELS, type TrialRequestStatus } from "@/lib/types";
import { IconBell, IconUser } from "@/components/icons";
import { Card, EmptyState, MetricCard, PageHeader, TableShell, Th } from "@/components/ui";
import RequestRow from "./request-row";

export default async function TrialRequestsPage() {
  await requireRole(["admin", "coordinator"]);
  const requests = listTrialRequests();
  const counts = Object.fromEntries(
    Object.keys(TRIAL_REQUEST_STATUS_LABELS).map((status) => [
      status,
      requests.filter((r) => r.status === status).length,
    ])
  ) as Record<TrialRequestStatus, number>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Đăng ký học thử"
        subtitle="Khách để lại thông tin ở trang chủ — gọi lại rồi đổi trạng thái để khỏi bỏ sót ai."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Chưa liên hệ"
          value={counts.new}
          unit="người"
          tone={counts.new ? "coral" : "navy"}
          icon={<IconBell className="w-5 h-5" />}
        />
        <MetricCard label="Đã liên hệ" value={counts.contacted} unit="người" tone="amber" />
        <MetricCard label="Đã xếp lớp" value={counts.done} unit="người" tone="mint" />
        <MetricCard label="Không học" value={counts.cancelled} unit="người" />
      </div>

      <Card padded={false}>
        {requests.length === 0 ? (
          <EmptyState
            icon={<IconUser className="w-6 h-6" />}
            title="Chưa có ai đăng ký học thử"
            description="Đăng ký từ nút 'Học thử miễn phí' ngoài trang chủ sẽ hiện ở đây."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Học viên</Th>
                <Th>Liên hệ</Th>
                <Th>Muốn học</Th>
                <Th>Ghi chú</Th>
                <Th>Trạng thái</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {requests.map((r) => (
                <RequestRow key={r.id} request={r} />
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
