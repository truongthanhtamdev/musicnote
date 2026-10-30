import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { listTrialRequests } from "@/lib/queries";
import { TRIAL_REQUEST_STATUS_LABELS, type TrialRequestStatus, MANAGE_ROLES } from "@/lib/types";
import { IconBell, IconUser } from "@/components/icons";
import { Card, EmptyState, MetricCard, PageHeader, TableShell, Th } from "@/components/ui";
import RequestRow from "./request-row";

export default async function TrialRequestsPage() {
  // Nhân viên đặt hẹn không còn xử lý đăng ký học thử — chỉ Quản lý trở lên.
  const session = await requireRole(MANAGE_ROLES);
  const canManage = MANAGE_ROLES.includes(session.role);
  // Quản lý xếp lịch hộ thì chọn người nhận thưởng — nhân viên đặt hẹn đứng đầu danh sách.
  const staff = db
    .prepare(
      `SELECT id, name FROM users WHERE role IN ('coordinator','manager','admin') AND active = 1
        ORDER BY CASE role WHEN 'coordinator' THEN 0 ELSE 1 END, name`
    )
    .all() as { id: number; name: string }[];
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
          <TableShell stackOnMobile>
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
                <RequestRow
                  key={r.id}
                  request={r}
                  canCreateClass={canManage}
                  staff={canManage ? staff : undefined}
                  selfId={session.userId}
                />
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
