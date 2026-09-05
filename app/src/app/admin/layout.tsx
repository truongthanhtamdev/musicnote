import { requireRole } from "@/lib/guard";
import { countLeadsDue } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import type { NavGroup } from "@/components/shell-nav";
import {
  IconBanknote,
  IconBook,
  IconCalendar,
  IconChart,
  IconCheckSquare,
  IconDashboard,
  IconGraduation,
  IconUpload,
  IconUserCog,
  IconUsers,
  IconWallet,
} from "@/components/icons";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["admin", "coordinator"]);
  const isAdmin = session.role === "admin";
  const leadsDue = countLeadsDue();

  const groups: NavGroup[] = [
    {
      label: "Không gian làm việc",
      items: [
        { href: "/admin", label: "Tổng quan", icon: <IconDashboard /> },
        {
          href: "/admin/leads",
          label: "Khách tiềm năng",
          icon: <IconUsers />,
          badge: leadsDue,
        },
        { href: "/admin/leads/report", label: "Báo cáo & doanh thu", icon: <IconChart /> },
      ],
    },
    {
      label: "Quản lý đào tạo",
      items: [
        { href: "/admin/classes", label: "Lớp học", icon: <IconBook /> },
        { href: "/admin/assign", label: "Giao lớp", icon: <IconCalendar /> },
        ...(isAdmin
          ? [{ href: "/admin/students", label: "Học viên", icon: <IconGraduation /> }]
          : []),
        { href: "/admin/teachers", label: "Giáo viên", icon: <IconUsers /> },
        { href: "/admin/attendance", label: "Điểm danh", icon: <IconCheckSquare /> },
      ],
    },
    {
      label: "Vận hành",
      items: [
        ...(isAdmin
          ? [
              { href: "/admin/payroll", label: "Chấm công / Lương", icon: <IconWallet /> },
              { href: "/admin/finance", label: "Thu chi trung tâm", icon: <IconBanknote /> },
              { href: "/admin/staff", label: "Nhân sự quản lý", icon: <IconUserCog /> },
            ]
          : []),
        { href: "/admin/import", label: "Nhập dữ liệu", icon: <IconUpload /> },
      ],
    },
  ];

  return (
    <AppShell
      workspace="Piano Guitar Đệm Hát"
      groups={groups}
      userName={session.name}
      roleLabel={isAdmin ? "Admin" : "Giáo vụ"}
    >
      {children}
    </AppShell>
  );
}
