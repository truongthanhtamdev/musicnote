import { requireRole } from "@/lib/guard";
import { AppShell, type NavItem } from "@/components/app-shell";
import { listClassesByDay, listAttendance } from "@/lib/queries";
import { todayISO, now } from "@/lib/format";
import {
  IconCalendarCheck,
  IconChart,
  IconClasses,
  IconDownload,
  IconHome,
  IconPackage,
  IconSettings,
  IconTeacher,
  IconUpload,
  IconUser,
  IconUsers,
  IconWallet,
} from "@/components/icons";

const ICON = "w-5 h-5";

/** Số lớp hôm nay đã qua giờ kết thúc mà chưa có điểm danh — hiện ở chuông cảnh báo. */
function overdueTodayCount(): number {
  const today = now();
  const todayStr = todayISO();
  const marked = new Set(listAttendance({ from: todayStr, to: todayStr }).map((a) => a.class_id));
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  return listClassesByDay(today.getDay()).filter((c) => {
    if (marked.has(c.id)) return false;
    const [h, m] = c.start_time.split(":").map(Number);
    return nowMinutes > h * 60 + m + c.duration_minutes;
  }).length;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["admin", "coordinator"]);

  const links: NavItem[] = [
    { href: "/admin", label: "Tổng quan", icon: <IconHome className={ICON} /> },
    { href: "/admin/classes", label: "Lớp học", icon: <IconClasses className={ICON} /> },
    {
      href: "/admin/attendance",
      label: "Lịch & điểm danh",
      icon: <IconCalendarCheck className={ICON} />,
    },
    ...(session.role === "admin"
      ? [
          {
            href: "/admin/packages",
            label: "Học viên & gói học",
            icon: <IconPackage className={ICON} />,
          },
        ]
      : []),
    { href: "/admin/assign", label: "Giao lớp", icon: <IconUsers className={ICON} /> },
    { href: "/admin/teachers", label: "Giáo viên", icon: <IconTeacher className={ICON} /> },
    ...(session.role === "admin"
      ? [
          {
            href: "/admin/payroll",
            label: "Chấm công / Lương",
            icon: <IconWallet className={ICON} />,
          },
          { href: "/admin/finance", label: "Doanh thu", icon: <IconChart className={ICON} /> },
        ]
      : []),
    { href: "/admin/import", label: "Nhập dữ liệu", icon: <IconUpload className={ICON} /> },
    ...(session.role === "admin"
      ? [
          {
            href: "/admin/students",
            label: "Tài khoản học viên",
            icon: <IconUser className={ICON} />,
          },
          {
            href: "/admin/staff",
            label: "Nhân sự quản lý",
            icon: <IconSettings className={ICON} />,
          },
          {
            href: "/admin/backup",
            label: "Sao lưu dữ liệu",
            icon: <IconDownload className={ICON} />,
          },
        ]
      : []),
  ];

  return (
    <AppShell
      brandTitle="Piano Guitar Đệm Hát"
      userName={session.name}
      roleLabel={session.role === "admin" ? "Quản trị viên" : "Giáo vụ"}
      links={links}
      alertCount={overdueTodayCount()}
    >
      {children}
    </AppShell>
  );
}
