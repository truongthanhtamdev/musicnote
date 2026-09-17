import { requireRole } from "@/lib/guard";
import { AppShell, type NavItem } from "@/components/app-shell";
import { IconCalendarCheck, IconGuitar, IconPiano, IconUser } from "@/components/icons";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["student"]);

  const links: NavItem[] = [
    { href: "/student", label: "Lịch học của tôi", icon: <IconCalendarCheck className="w-5 h-5" /> },
    { href: "/student/ho-so", label: "Thông tin của tôi", icon: <IconUser className="w-5 h-5" /> },
    // Thư viện học nhạc là trang công khai, nhưng học viên dùng nhiều nhất
    // nên để luôn trong menu cho khỏi phải nhớ địa chỉ.
    { href: "/guitar", label: "Thư viện guitar", icon: <IconGuitar className="w-5 h-5" /> },
    { href: "/piano", label: "Thư viện piano", icon: <IconPiano className="w-5 h-5" /> },
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
