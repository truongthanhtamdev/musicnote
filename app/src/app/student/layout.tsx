import { requireRole } from "@/lib/guard";
import { countUnreadMessages } from "@/lib/queries";
import { AppShell, type NavItem } from "@/components/app-shell";
import { IconCalendarCheck, IconChat } from "@/components/icons";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["student"]);
  const unread = countUnreadMessages(session.userId, "student");

  const links: NavItem[] = [
    { href: "/student", label: "Lịch học của tôi", icon: <IconCalendarCheck className="w-5 h-5" /> },
    {
      href: "/student/messages",
      label: "Tin nhắn",
      icon: <IconChat className="w-5 h-5" />,
      badge: unread || undefined,
    },
  ];

  return (
    <AppShell
      brandTitle="Piano Guitar Đệm Hát"
      userName={session.name}
      roleLabel="Học viên"
      links={links}
      maxWidth="max-w-4xl"
    >
      {children}
    </AppShell>
  );
}
