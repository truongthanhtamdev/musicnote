import { requireRole } from "@/lib/guard";
import { AppShell, type NavItem } from "@/components/app-shell";
import { IconCalendarCheck } from "@/components/icons";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["student"]);

  const links: NavItem[] = [
    { href: "/student", label: "Lịch học của tôi", icon: <IconCalendarCheck className="w-5 h-5" /> },
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
