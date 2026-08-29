import Link from "next/link";
import { logoutAction } from "@/actions/auth";

interface NavLink {
  href: string;
  label: string;
}

export function TopNav({
  title,
  userName,
  links,
}: {
  title: string;
  userName: string;
  links: NavLink[];
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="font-bold text-slate-900">{title}</span>
            <nav className="hidden md:flex items-center gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md px-3 py-1.5 transition"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:inline">{userName}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-slate-500 hover:text-red-600 border border-slate-200 rounded-md px-3 py-1.5 transition"
              >
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
        <nav className="flex md:hidden items-center gap-1 pb-2 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md px-3 py-1.5 transition whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
