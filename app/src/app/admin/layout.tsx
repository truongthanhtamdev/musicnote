import { requireRole } from "@/lib/guard";
import { TopNav } from "@/components/nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["admin", "coordinator"]);

  const links = [
    { href: "/admin", label: "Tổng quan" },
    { href: "/admin/classes", label: "Lớp học" },
    { href: "/admin/assign", label: "Giao lớp" },
    { href: "/admin/teachers", label: "Giáo viên" },
    { href: "/admin/attendance", label: "Điểm danh" },
    { href: "/admin/import", label: "Nhập dữ liệu" },
    ...(session.role === "admin"
      ? [
          { href: "/admin/payroll", label: "Chấm công / Lương" },
          { href: "/admin/staff", label: "Nhân sự quản lý" },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav
        title="MusicNote Guitar"
        userName={`${session.name} (${session.role === "admin" ? "Admin" : "Quản lý ca"})`}
        links={links}
      />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
