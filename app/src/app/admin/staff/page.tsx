import { requireRole } from "@/lib/guard";
import { MANAGE_ROLES, ROLE_LABELS, type Role } from "@/lib/types";
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
import NewStaffForm from "./new-staff-form";
import RoleSelect from "./role-select";
import ResetPasswordButton from "@/components/reset-password-button";

const ROLE_TONE: Record<string, "navy" | "wood" | "neutral"> = {
  admin: "navy",
  manager: "wood",
  coordinator: "neutral",
};

export default async function StaffPage() {
  const session = await requireRole(MANAGE_ROLES);
  const staff = listStaff();
  const isOwner = session.role === "admin";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nhân sự quản lý"
        subtitle="Chủ trung tâm có toàn quyền. Quản lý làm được mọi thứ trừ sổ sách tiền bạc. Giáo vụ chỉ xếp lớp và chăm khách."
      />

      <Card padded={false}>
        <TableShell>
          <thead>
            <tr>
              <Th>Họ tên</Th>
              <Th>Email</Th>
              <Th>Vai trò</Th>
              <Th>Đổi vai trò</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {staff.map((s) => {
              // Không tự đổi vai trò của chính mình, và Quản lý không đụng
              // được vào tài khoản chủ trung tâm. Máy chủ chặn lại lần nữa.
              const locked = s.id === session.userId || (s.role === "admin" && !isOwner);
              return (
                <tr key={s.id} className="hover:bg-ivory-50">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5 font-medium text-ink-900 whitespace-nowrap">
                      <Avatar name={s.name} className="w-8 h-8 text-[11px]" />
                      {s.name}
                      {s.id === session.userId && (
                        <span className="text-xs font-normal text-ink-400">(bạn)</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{s.email}</td>
                  <td className="px-4 py-3">
                    <StatusChip tone={ROLE_TONE[s.role] ?? "neutral"}>
                      {ROLE_LABELS[s.role as Role]}
                    </StatusChip>
                  </td>
                  <td className="px-4 py-3">
                    {locked ? (
                      <span className="text-sm text-ink-400">—</span>
                    ) : (
                      <RoleSelect
                        userId={s.id}
                        role={s.role as Role}
                        canSetAdmin={isOwner}
                        disabled={false}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.role === "admin" && !isOwner ? (
                      <span className="text-sm text-ink-400">—</span>
                    ) : (
                      <ResetPasswordButton userId={s.id} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      </Card>

      <Card padded={false} className="max-w-2xl">
        <CardHeader
          title="Thêm tài khoản nhân sự"
          icon={<IconSettings className="w-4.5 h-4.5 text-wood-500" />}
        />
        <div className="p-5">
          <NewStaffForm canCreateAdmin={isOwner} />
        </div>
      </Card>
    </div>
  );
}
