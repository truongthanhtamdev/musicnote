import { requireRole } from "@/lib/guard";
import { TopNav } from "@/components/nav";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["student"]);

  const links = [{ href: "/student", label: "Lịch học của tôi" }];

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav title="Piano Guitar Đệm Hát" userName={session.name} links={links} />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
