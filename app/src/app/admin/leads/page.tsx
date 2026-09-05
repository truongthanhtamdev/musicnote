import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { listLeads, listLeadFieldValues, listStaff, type LeadWithMeta } from "@/lib/queries";
import { formatVND, todayISO } from "@/lib/format";
import {
  LEAD_STATUS_LABELS,
  LEARNING_MODE_LABELS,
  SUBJECT_SUGGESTIONS,
  zaloLink,
  type LeadStatus,
} from "@/lib/types";
import { PageHeader } from "@/components/app-shell";
import {
  IconArrowRight,
  IconBanknote,
  IconChat,
  IconClock,
  IconPhone,
  IconTarget,
  IconUsers,
} from "@/components/icons";
import NewLeadForm from "./new-lead-form";
import { LeadStatusBadge } from "./lead-badges";

function StatCard({
  label,
  value,
  hint,
  icon,
  dark,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div className={`stat ${dark ? "stat--dark" : ""}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

function ContactCell({ lead }: { lead: LeadWithMeta }) {
  return (
    <div>
      <Link href={`/admin/leads/${lead.id}`} className="font-semibold text-ink hover:text-brand-700">
        {lead.name}
      </Link>
      <div className="mt-0.5 flex flex-wrap gap-x-2 text-[12px]">
        {lead.phone && (
          <a
            href={zaloLink(lead.phone)}
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 hover:underline"
          >
            {lead.phone}
          </a>
        )}
        {lead.fb_url ? (
          <a
            href={lead.fb_url}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-500 hover:underline"
          >
            {lead.fb_name || "Facebook"}
          </a>
        ) : (
          lead.fb_name && <span className="text-muted">{lead.fb_name}</span>
        )}
      </div>
    </div>
  );
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    source?: string;
    area?: string;
    mode?: string;
    subject?: string;
    due?: string;
  }>;
}) {
  const session = await requireRole(["admin", "coordinator"]);
  const sp = await searchParams;
  const dueOnly = sp.due === "1";

  const leads = listLeads({
    search: sp.q || undefined,
    status: sp.status || undefined,
    source: sp.source || undefined,
    area: sp.area || undefined,
    learningMode: sp.mode || undefined,
    subject: sp.subject || undefined,
    dueOnly,
    order: dueOnly ? "follow_up" : "recent",
  });

  const all = listLeads();
  const today = todayISO();
  const isClosed = (s: string) => s === "won" || s === "lost" || s === "cold";
  const openCount = all.filter((l) => !isClosed(l.status)).length;
  const dueCount = all.filter(
    (l) => l.next_follow_up && l.next_follow_up <= today && !isClosed(l.status)
  ).length;
  const wonCount = all.filter((l) => l.status === "won").length;
  const revenue = all.reduce((sum, l) => sum + l.revenue, 0);

  const exportQuery = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => !!v) as [string, string][]
  ).toString();
  const exportHref = `/admin/leads/export${exportQuery ? `?${exportQuery}` : ""}`;

  const staff = listStaff().map((s) => ({ id: s.id, name: s.name }));
  const areas = listLeadFieldValues("area");
  const sources = listLeadFieldValues("source");

  return (
    <>
      <PageHeader
        eyebrow="Kênh Facebook"
        title="Khách tiềm năng"
        sub="Theo dõi từ lúc khách nhắn tin đến lúc đăng ký học và đóng học phí."
        actions={
          <>
            <Link href="/admin/leads/report" className="btn btn-ghost">
              Báo cáo &amp; doanh thu
            </Link>
            <a href={exportHref} className="btn btn-ghost">
              Xuất CSV
            </a>
            <a href="#them-khach" className="btn btn-primary">
              Thêm khách
            </a>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Tổng khách"
          value={String(all.length).padStart(2, "0")}
          hint="Đã lưu trong hệ thống"
          icon={<IconUsers />}
        />
        <StatCard
          label="Đang theo"
          value={String(openCount).padStart(2, "0")}
          hint="Chưa chốt, chưa bỏ"
          icon={<IconChat />}
        />
        <StatCard
          label="Cần liên hệ"
          value={String(dueCount).padStart(2, "0")}
          hint="Đã tới hạn gọi lại"
          icon={<IconPhone />}
        />
        <StatCard
          label="Đã chốt"
          value={String(wonCount).padStart(2, "0")}
          hint={all.length > 0 ? `${Math.round((wonCount / all.length) * 100)}% tổng khách` : "—"}
          icon={<IconTarget />}
        />
        <StatCard
          label="Doanh thu từ khách"
          value={formatVND(revenue)}
          hint="Học phí đã thu"
          icon={<IconBanknote />}
          dark
        />
      </div>

      {dueCount > 0 && !dueOnly && (
        <Link href="/admin/leads?due=1" className="alert mt-4">
          <IconClock className="size-4 shrink-0" />
          <span>
            <b>{dueCount}</b> khách tới hạn liên hệ lại hôm nay hoặc đã quá hạn
          </span>
          <IconArrowRight className="ml-auto size-4 shrink-0" />
        </Link>
      )}

      <form className="card mt-5 flex flex-wrap items-end gap-3 p-[18px]">
        {dueOnly && <input type="hidden" name="due" value="1" />}
        <div className="min-w-52 grow">
          <label className="label">Tìm kiếm</label>
          <input
            name="q"
            defaultValue={sp.q || ""}
            placeholder="Tên, SĐT, khu vực, nhu cầu..."
            className="input"
          />
        </div>
        <div>
          <label className="label">Trạng thái</label>
          <select name="status" defaultValue={sp.status || ""} className="input">
            <option value="">Tất cả</option>
            <option value="open">Đang theo</option>
            {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Nguồn</label>
          <select name="source" defaultValue={sp.source || ""} className="input">
            <option value="">Tất cả</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Khu vực</label>
          <select name="area" defaultValue={sp.area || ""} className="input">
            <option value="">Tất cả</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Hình thức</label>
          <select name="mode" defaultValue={sp.mode || ""} className="input">
            <option value="">Tất cả</option>
            {Object.entries(LEARNING_MODE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Môn</label>
          <select name="subject" defaultValue={sp.subject || ""} className="input">
            <option value="">Tất cả</option>
            {SUBJECT_SUGGESTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Lọc
        </button>
        <Link href="/admin/leads" className="px-2 py-2 text-[12.5px] text-muted hover:text-ink">
          Xoá lọc
        </Link>
      </form>

      <div className="panel mt-5">
        <div className="panel-head">
          <div className="flex items-center gap-2.5">
            <h2 className="panel-title">{dueOnly ? "Cần liên hệ hôm nay" : "Danh sách khách"}</h2>
            <span className="chip">{leads.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Khu vực</th>
                <th>Nhu cầu</th>
                <th>Nguồn</th>
                <th>Trạng thái</th>
                <th>Liên hệ lại</th>
                <th>Phụ trách</th>
                <th className="num">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const overdue =
                  !!l.next_follow_up && l.next_follow_up <= today && !isClosed(l.status);
                return (
                  <tr key={l.id} className={overdue ? "bg-amber-50/60" : ""}>
                    <td>
                      <ContactCell lead={l} />
                    </td>
                    <td className="text-ink-soft">{l.area || "—"}</td>
                    <td>
                      <span className="block text-ink-soft">
                        {l.subject} · {LEARNING_MODE_LABELS[l.learning_mode]}
                      </span>
                      {l.need && <span className="block text-[12px] text-muted">{l.need}</span>}
                    </td>
                    <td>
                      <span className="block text-ink-soft">{l.source}</span>
                      <span className="block text-[12px] text-muted tabular">{l.received_at}</span>
                    </td>
                    <td>
                      <LeadStatusBadge status={l.status} />
                    </td>
                    <td className={overdue ? "font-semibold text-amber-700 tabular" : "text-ink-soft tabular"}>
                      {l.next_follow_up || "—"}
                    </td>
                    <td className="text-ink-soft">{l.owner_name || "—"}</td>
                    <td className="num font-semibold text-brand-700">
                      {l.revenue > 0 ? formatVND(l.revenue) : "—"}
                    </td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    Chưa có khách hàng nào khớp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div id="them-khach" className="panel mt-5 scroll-mt-20 p-[18px]">
        <h2 className="panel-title mb-4">Thêm khách hàng tiềm năng</h2>
        <NewLeadForm staff={staff} currentUserId={session.userId} />
      </div>
    </>
  );
}
