import { requireRole } from "@/lib/guard";
import { countLeadsDue } from "@/lib/queries";
import { countTodayWork } from "@/lib/reminders";
import { AppShell } from "@/components/app-shell";
import type { NavGroup } from "@/components/shell-nav";
import {
  IconBanknote,
  IconBell,
  IconClock,
  IconChart,
  IconDashboard,
  IconUpload,
  IconUserCog,
  IconUsers,
} from "@/components/icons";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["admin", "coordinator"]);
  const isAdmin = session.role === "admin";
  const leadsDue = countLeadsDue();
  const todayWork = countTodayWork();

  const groups: NavGroup[] = [
    {
      label: "Không gian làm việc",
      items: [
        { href: "/admin", label: "Tổng quan", icon: <IconDashboard /> },
        { href: "/admin/today", label: "Hôm nay", icon: <IconClock />, badge: todayWork },
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
      label: "Vận hành",
      items: [
        ...(isAdmin
          ? [
              { href: "/admin/finance", label: "Thu chi", icon: <IconBanknote /> },
              { href: "/admin/staff", label: "Nhân sự", icon: <IconUserCog /> },
            ]
          : []),
        { href: "/admin/import", label: "Nhập dữ liệu", icon: <IconUpload /> },
        ...(isAdmin
          ? [{ href: "/admin/settings", label: "Nhắc việc & cài đặt", icon: <IconBell /> }]
          : []),
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
