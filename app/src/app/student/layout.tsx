import { requireRole } from "@/lib/guard";
import { AppShell } from "@/components/app-shell";
import type { NavGroup } from "@/components/shell-nav";
import { IconGraduation } from "@/components/icons";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["student"]);

  const groups: NavGroup[] = [
    {
      label: "Của tôi",
      items: [{ href: "/student", label: "Lịch học của tôi", icon: <IconGraduation /> }],
    },
  ];

  return (
    <AppShell
      workspace="Piano Guitar Đệm Hát"
      groups={groups}
      userName={session.name}
      roleLabel="Học viên"
    >
      {children}
    </AppShell>
  );
}
