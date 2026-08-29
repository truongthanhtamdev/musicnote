import { requireRole } from "@/lib/guard";
import { TopNav } from "@/components/nav";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["teacher"]);

  const links = [
    { href: "/teacher", label: "Hôm nay" },
    { href: "/teacher/schedule", label: "Lịch dạy" },
    { href: "/teacher/attendance", label: "Lịch sử điểm danh" },
    { href: "/teacher/availability", label: "Khung giờ rảnh" },
    { href: "/teacher/earnings", label: "Thu nhập" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav title="pianoguitardemhatnhe" userName={session.name} links={links} />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
