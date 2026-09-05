import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { IconHelp, IconSidebar, IconCalendar, IconUsers } from "./icons";
import { CurrentPageLabel, MobileNav, SidebarNav, type NavGroup } from "./shell-nav";

const MONTHS = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12",
];

function todayLabel(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")} tháng ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

/** Chữ viết tắt trên ô đại diện: chữ cái đầu của từ đầu và từ cuối. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function AppShell({
  workspace,
  groups,
  userName,
  roleLabel,
  children,
}: {
  workspace: string;
  groups: NavGroup[];
  userName: string;
  roleLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper lg:flex">
      <aside className="hidden w-60 shrink-0 flex-col bg-brand-900 px-3 py-4 lg:flex lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center gap-2.5 px-2 pb-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-200">
            <IconUsers />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-bold leading-tight text-white">ClientHub</span>
            <span className="block truncate text-[9.5px] font-semibold uppercase tracking-[.14em] text-brand-300/80">
              Quản lý khách hàng
            </span>
          </span>
        </div>

        <div className="mb-6 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5">
          <span className="size-1.5 shrink-0 rounded-full bg-brand-400" />
          <span className="truncate text-[12.5px] text-brand-100">{workspace}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav groups={groups} />
        </div>

        <div className="mt-6 flex items-start gap-2 border-t border-white/10 px-2 pt-4 text-brand-300/80">
          <IconHelp className="mt-0.5 size-4 shrink-0" />
          <span className="text-[11.5px] leading-snug">
            Dữ liệu khách hàng
            <span className="block text-brand-300/60">Chỉ Admin và Giáo vụ xem được</span>
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-white/5 px-2.5 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-[12px] font-bold text-white">
            {initials(userName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold text-white">{userName}</span>
            <span className="block text-[11px] text-brand-300/80">{roleLabel}</span>
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Đăng xuất"
              className="rounded-md px-2 py-1 text-[11px] text-brand-300/80 transition hover:bg-white/10 hover:text-white"
            >
              Thoát
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5 text-[13px] text-muted">
              <IconSidebar className="hidden size-4 shrink-0 lg:block" />
              <Link href="/" className="hidden shrink-0 hover:text-ink lg:inline">
                Không gian làm việc
              </Link>
              <span className="hidden text-line lg:inline">/</span>
              <span className="truncate lg:hidden">
                <span className="font-bold text-ink">ClientHub</span>
              </span>
              <span className="hidden truncate lg:inline">
                <CurrentPageLabel groups={groups} />
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-[12.5px] text-muted">
              <span className="hidden items-center gap-1.5 sm:flex">
                <IconCalendar className="size-4" />
                {todayLabel()}
              </span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-[11.5px] font-bold text-white lg:hidden">
                {initials(userName)}
              </span>
            </div>
          </div>
          <MobileNav groups={groups} />
        </header>

        <main className="mx-auto max-w-6xl px-4 py-7 lg:px-8 lg:py-9">{children}</main>
      </div>
    </div>
  );
}

/** Tiêu đề chuẩn của mọi trang: dòng nhãn nhỏ, tiêu đề lớn, dòng mô tả. */
export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
  plain,
}: {
  eyebrow: string;
  title: string;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  /** Bỏ dấu chấm trang trí — dùng khi tiêu đề là tên riêng. */
  plain?: boolean;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className={`page-title ${plain ? "page-title--plain" : ""}`}>{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
