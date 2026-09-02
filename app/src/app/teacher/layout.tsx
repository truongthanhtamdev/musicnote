import { requireRole } from "@/lib/guard";
import { AppShell, type NavItem } from "@/components/app-shell";
import { NotificationsBanner } from "@/components/notifications-banner";
import { listClassesForTeacher, getAttendance, listUnreadNotifications } from "@/lib/queries";
import { todayISO } from "@/lib/format";
import {
  IconCalendarCheck,
  IconClasses,
  IconClock,
  IconHome,
  IconWallet,
} from "@/components/icons";

const ICON = "w-5 h-5";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["teacher"]);

  const links: NavItem[] = [
    { href: "/teacher", label: "Hôm nay", icon: <IconHome className={ICON} /> },
    { href: "/teacher/schedule", label: "Lịch dạy", icon: <IconClasses className={ICON} /> },
    {
      href: "/teacher/attendance",
      label: "Điểm danh",
      icon: <IconCalendarCheck className={ICON} />,
    },
    { href: "/teacher/availability", label: "Lịch tuần", icon: <IconClock className={ICON} /> },
    { href: "/teacher/earnings", label: "Thu nhập", icon: <IconWallet className={ICON} /> },
  ];

  // Badge chuông: lớp hôm nay chưa điểm danh + thông báo chưa đọc.
  const todayStr = todayISO();
  const dow = new Date().getDay();
  const pending = listClassesForTeacher(session.userId).filter(
    (c) =>
      c.status === "active" &&
      c.schedule_type === "fixed" &&
      c.day_of_week === dow &&
      !getAttendance(c.id, todayStr)
  ).length;
  const unread = listUnreadNotifications(session.userId).length;

  return (
    <AppShell
      brandTitle="Piano Guitar Đệm Hát"
      userName={session.name}
      roleLabel="Giáo viên"
      links={links}
      bottomNav={links.map((l) =>
        l.href === "/teacher/availability" ? { ...l, label: "Lịch tuần" } : l
      )}
      alertCount={pending + unread}
      maxWidth="max-w-5xl"
    >
      <NotificationsBanner userId={session.userId} />
      {children}
    </AppShell>
  );
}
