"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Số hiện bên phải mục (VD số khách cần gọi). Bỏ qua nếu là 0. */
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Trang gốc của mỗi vai trò khớp chính xác, trang con khớp theo tiền tố. */
function matches(pathname: string, href: string): boolean {
  if (href === "/admin" || href === "/teacher" || href === "/student") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Chỉ MỘT mục được sáng: mục có đường dẫn khớp dài nhất. Nếu không, mở
 * /admin/leads/report sẽ làm sáng cả "Khách tiềm năng" lẫn "Báo cáo".
 */
function useActiveHref(groups: NavGroup[]): string | undefined {
  const pathname = usePathname();
  return groups
    .flatMap((g) => g.items)
    .filter((i) => matches(pathname, i.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function SidebarNav({ groups }: { groups: NavGroup[] }) {
  const activeHref = useActiveHref(groups);

  return (
    <nav className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[.14em] text-brand-300/70">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition ${
                  active
                    ? "bg-brand-800 font-semibold text-white shadow-[inset_2px_0_0_var(--color-brand-400)]"
                    : "text-brand-100/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className={active ? "text-brand-300" : "text-brand-200/60 group-hover:text-brand-200"}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
                {!!item.badge && (
                  <span className="ml-auto rounded-full bg-brand-500/25 px-1.5 py-0.5 text-[10.5px] font-bold text-brand-100 tabular">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Thanh điều hướng ngang thay cho sidebar khi màn hình hẹp. */
export function MobileNav({ groups }: { groups: NavGroup[] }) {
  const activeHref = useActiveHref(groups);
  const items = groups.flatMap((g) => g.items);

  return (
    <nav className="flex gap-1.5 overflow-x-auto px-4 pb-3 lg:hidden">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] transition ${
              active
                ? "border-brand-600 bg-brand-600 font-semibold text-white"
                : "border-line bg-surface text-ink-soft hover:border-brand-200"
            }`}
          >
            {item.icon}
            {item.label}
            {!!item.badge && <span className="chip">{item.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/** Tên trang đang mở, hiện ở đường dẫn phân cấp trên thanh trên cùng. */
export function CurrentPageLabel({ groups }: { groups: NavGroup[] }) {
  const activeHref = useActiveHref(groups);
  const match = groups.flatMap((g) => g.items).find((i) => i.href === activeHref);
  return <span className="font-medium text-ink">{match?.label ?? "Chi tiết"}</span>;
}
