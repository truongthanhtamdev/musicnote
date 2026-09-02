"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { logoutAction } from "@/actions/auth";
import { Logo } from "./logo";
import { IconBell, IconKey, IconLogout, IconMenu, IconX } from "./icons";
import { Avatar } from "./ui";

export interface NavItem {
  href: string;
  label: string;
  /** Icon đã render sẵn ở server component và truyền xuống. */
  icon: ReactNode;
}

function isActive(pathname: string, href: string, roots: string[]): boolean {
  if (roots.includes(href)) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

/* ------------------------------ Sidebar link ----------------------------- */

function SidebarLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-wood-500/15 text-wood-200 shadow-[inset_2px_0_0_var(--color-wood-400)]"
          : "text-navy-200 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className={active ? "text-wood-300" : "text-navy-300"}>{item.icon}</span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/* -------------------------------- Brand ---------------------------------- */

function Brand({ title, compact = false }: { title: string; compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <Logo className={compact ? "h-7 shrink-0" : "h-9 shrink-0"} />
      <span
        className={`font-bold text-white leading-tight ${compact ? "text-sm truncate" : "text-[15px]"}`}
      >
        {title}
      </span>
    </span>
  );
}

/* ------------------------------- User block ------------------------------ */

function UserBlock({ name, roleLabel }: { name: string; roleLabel: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
      <Avatar name={name} className="w-9 h-9 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">{name}</p>
        <p className="text-xs text-navy-300 truncate">{roleLabel}</p>
      </div>
      <Link
        href="/account/password"
        title="Đổi mật khẩu"
        aria-label="Đổi mật khẩu"
        className="text-navy-300 hover:text-wood-300 p-1.5 rounded-lg hover:bg-white/5 transition"
      >
        <IconKey className="w-4.5 h-4.5" />
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          title="Đăng xuất"
          aria-label="Đăng xuất"
          className="text-navy-300 hover:text-coral-300 p-1.5 rounded-lg hover:bg-white/5 transition"
        >
          <IconLogout className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
}

/* -------------------------------- Shell ---------------------------------- */

export function AppShell({
  brandTitle,
  userName,
  roleLabel,
  links,
  bottomNav,
  alertCount = 0,
  children,
  maxWidth = "max-w-7xl",
}: {
  brandTitle: string;
  userName: string;
  roleLabel: string;
  links: NavItem[];
  /** Điều hướng dưới cùng trên mobile (vai trò giáo viên/học viên). */
  bottomNav?: NavItem[];
  alertCount?: number;
  children: ReactNode;
  maxWidth?: string;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const roots = ["/admin", "/teacher", "/student"];

  // Đóng drawer khi điều hướng sang trang khác.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const nav = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-1 overflow-y-auto scroll-thin px-3 py-4">
      {links.map((l) => (
        <SidebarLink
          key={l.href}
          item={l}
          active={isActive(pathname, l.href, roots)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-ivory-50">
      {/* Sidebar cố định — desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-navy-950 border-r border-navy-900 z-30">
        <div className="px-5 h-16 flex items-center border-b border-white/5">
          <Brand title={brandTitle} />
        </div>
        {nav()}
        <div className="p-3 border-t border-white/5">
          <UserBlock name={userName} roleLabel={roleLabel} />
        </div>
      </aside>

      {/* Header — mobile/tablet */}
      <header className="lg:hidden sticky top-0 z-30 bg-navy-950 text-white">
        <div className="h-14 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Mở menu"
              className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition"
            >
              <IconMenu className="w-5 h-5" />
            </button>
            <Brand title={brandTitle} compact />
          </div>
          <div className="flex items-center gap-1">
            <span className="relative p-2 text-navy-200">
              <IconBell className="w-5 h-5" />
              {alertCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-coral-500 text-[10px] font-bold text-white flex items-center justify-center tabular">
                  {alertCount}
                </span>
              )}
              <span className="sr-only">{alertCount} cảnh báo cần xử lý</span>
            </span>
            <Avatar name={userName} className="w-8 h-8 text-[11px]" />
          </div>
        </div>
      </header>

      {/* Drawer — mobile */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-[1px]"
          />
          <div className="relative w-72 max-w-[85vw] bg-navy-950 flex flex-col h-full shadow-2xl">
            <div className="px-4 h-14 flex items-center justify-between border-b border-white/5">
              <Brand title={brandTitle} compact />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Đóng menu"
                className="p-2 rounded-lg text-navy-200 hover:bg-white/10"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>
            {nav(() => setDrawerOpen(false))}
            <div className="p-3 border-t border-white/5">
              <UserBlock name={userName} roleLabel={roleLabel} />
            </div>
          </div>
        </div>
      )}

      {/* Nội dung */}
      <div className="lg:pl-64">
        <main
          className={`${maxWidth} mx-auto px-4 sm:px-6 py-5 sm:py-7 ${
            bottomNav ? "pb-24 lg:pb-8" : "pb-10"
          }`}
        >
          {children}
        </main>
      </div>

      {/* Bottom navigation — mobile, vai trò giáo viên */}
      {bottomNav && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-navy-100 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5">
            {bottomNav.slice(0, 5).map((l) => {
              const active = isActive(pathname, l.href, roots);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${
                    active ? "text-wood-600" : "text-ink-400 hover:text-ink-700"
                  }`}
                >
                  <span className={active ? "text-wood-600" : "text-ink-400"}>{l.icon}</span>
                  <span className="truncate max-w-full px-0.5">{l.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
