import { requireRole } from "@/lib/guard";
import { listStaff } from "@/lib/queries";
import { IconSettings } from "@/components/icons";
import {
  Avatar,
  Card,
  CardHeader,
  PageHeader,
  StatusChip,
  TableShell,
  Th,
} from "@/components/ui";
import NewCoordinatorForm from "./new-coordinator-form";
import ResetPasswordButton from "@/components/reset-password-button";

export default async function StaffPage() {
  await requireRole(["admin"]);
  const staff = listStaff();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nhân sự quản lý"
        subtitle="Admin có toàn quyền. Giáo vụ chỉ được xếp lớp và xem báo cáo, không xem/sửa được lương."
      />

      <Card padded={false}>
        <TableShell>
          <thead>
            <tr>
              <Th>Họ tên</Th>
              <Th>Email</Th>
              <Th>Vai trò</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-ivory-50">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5 font-medium text-ink-900 whitespace-nowrap">
                    <Avatar name={s.name} className="w-8 h-8 text-[11px]" />
                    {s.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-600">{s.email}</td>
                <td className="px-4 py-3">
                  <StatusChip tone={s.role === "admin" ? "navy" : "neutral"}>
                    {s.role === "admin" ? "Admin" : "Giáo vụ"}
                  </StatusChip>
                </td>
                <td className="px-4 py-3 text-right">
                  <ResetPasswordButton userId={s.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Card>

      <Card padded={false} className="max-w-2xl">
        <CardHeader
          title="Thêm giáo vụ"
          icon={<IconSettings className="w-4.5 h-4.5 text-wood-500" />}
        />
        <div className="p-5">
          <NewCoordinatorForm />
        </div>
      </Card>
    </div>
  );
}
