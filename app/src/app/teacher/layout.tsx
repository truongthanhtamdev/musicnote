import { requireRole } from "@/lib/guard";
import { AppShell } from "@/components/app-shell";
import type { NavGroup } from "@/components/shell-nav";
import {
  IconCalendar,
  IconCheckSquare,
  IconClock,
  IconDashboard,
  IconWallet,
} from "@/components/icons";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["teacher"]);

  const groups: NavGroup[] = [
    {
      label: "Hằng ngày",
      items: [
        { href: "/teacher", label: "Hôm nay", icon: <IconDashboard /> },
        { href: "/teacher/schedule", label: "Lịch dạy", icon: <IconCalendar /> },
        { href: "/teacher/attendance", label: "Lịch sử điểm danh", icon: <IconCheckSquare /> },
      ],
    },
    {
      label: "Cá nhân",
      items: [
        { href: "/teacher/availability", label: "Khung giờ rảnh", icon: <IconClock /> },
        { href: "/teacher/earnings", label: "Thu nhập", icon: <IconWallet /> },
      ],
    },
  ];

  return (
    <AppShell
      workspace="Piano Guitar Đệm Hát"
      groups={groups}
      userName={session.name}
      roleLabel="Giáo viên"
    >
      {children}
    </AppShell>
  );
}
