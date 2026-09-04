"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { Logo } from "./logo";

interface NavLink {
  href: string;
  label: string;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin" || href === "/teacher") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLinks({ links, className }: { links: NavLink[]; className: string }) {
  const pathname = usePathname();
  return (
    <>
      {links.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm rounded-md px-3 py-1.5 transition whitespace-nowrap ${className} ${
              active
                ? "text-gold-400 bg-gold-400/10 font-medium"
                : "text-neutral-300 hover:text-gold-400 hover:bg-white/5"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </>
  );
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
    <header className="bg-neutral-950 border-b border-neutral-800 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between min-h-14 py-2 gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <span className="flex items-center gap-2 whitespace-nowrap shrink-0">
              <Logo className="h-7 shrink-0" />
              <span className="font-bold text-gold-300">{title}</span>
            </span>
            {/* Cuốn xuống dòng thay vì cắt mất mục cuối: menu admin có tới 11 mục,
                ở màn hình laptop 1440px một hàng không đủ chỗ. */}
            <nav className="hidden md:flex flex-wrap items-center gap-1 min-w-0">
              <NavLinks links={links} className="" />
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-neutral-400 hidden sm:inline">{userName}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-neutral-400 hover:text-red-400 border border-neutral-700 hover:border-red-900 rounded-md px-3 py-1.5 transition"
              >
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
        <nav className="flex md:hidden items-center gap-1 pb-2 overflow-x-auto">
          <NavLinks links={links} className="" />
        </nav>
      </div>
    </header>
  );
}
