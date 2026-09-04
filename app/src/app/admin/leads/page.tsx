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
import NewLeadForm from "./new-lead-form";
import { LeadStatusBadge } from "./lead-badges";

const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function ContactCell({ lead }: { lead: LeadWithMeta }) {
  return (
    <div className="space-y-0.5">
      <Link href={`/admin/leads/${lead.id}`} className="font-medium text-slate-900 hover:underline">
        {lead.name}
      </Link>
      <div className="flex flex-wrap gap-x-2 text-xs">
        {lead.phone && (
          <a
            href={zaloLink(lead.phone)}
            target="_blank"
            rel="noreferrer"
            className="text-sky-600 hover:underline"
          >
            {lead.phone} (Zalo)
          </a>
        )}
        {lead.fb_url && (
          <a
            href={lead.fb_url}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 hover:underline"
          >
            {lead.fb_name || "Facebook"}
          </a>
        )}
        {!lead.fb_url && lead.fb_name && <span className="text-slate-400">{lead.fb_name}</span>}
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
  const openCount = all.filter((l) => l.status !== "won" && l.status !== "lost" && l.status !== "cold").length;
  const dueCount = all.filter(
    (l) => l.next_follow_up && l.next_follow_up <= today && l.status !== "won" && l.status !== "lost" && l.status !== "cold"
  ).length;
  const wonCount = all.filter((l) => l.status === "won").length;
  const revenue = all.reduce((sum, l) => sum + l.revenue, 0);

  // Xuất CSV theo đúng bộ lọc đang xem.
  const exportQuery = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => !!v) as [string, string][]
  ).toString();
  const exportHref = `/admin/leads/export${exportQuery ? `?${exportQuery}` : ""}`;

  const staff = listStaff().map((s) => ({ id: s.id, name: s.name }));
  const areas = listLeadFieldValues("area");
  const sources = listLeadFieldValues("source");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Khách hàng tiềm năng</h1>
          <p className="text-slate-500 text-sm mt-1">
            Data khách hỏi từ Facebook — theo dõi từ lúc nhắn tin đến lúc đăng ký học và đóng tiền.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/leads/report"
            className="text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2"
          >
            Báo cáo &amp; doanh thu
          </Link>
          <a
            href={exportHref}
            className="text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2"
          >
            Xuất CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Tổng lead" value={String(all.length)} />
        <StatCard label="Đang theo" value={String(openCount)} hint="chưa chốt, chưa bỏ" />
        <StatCard label="Cần liên hệ" value={String(dueCount)} hint="đã tới hạn hẹn gọi lại" />
        <StatCard
          label="Đã chốt"
          value={String(wonCount)}
          hint={all.length > 0 ? `${Math.round((wonCount / all.length) * 100)}% tổng lead` : undefined}
        />
        <StatCard label="Doanh thu từ lead" value={formatVND(revenue)} hint="tiền học đã thu" />
      </div>

      {dueCount > 0 && !dueOnly && (
        <Link
          href="/admin/leads?due=1"
          className="block bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm hover:bg-amber-100"
        >
          Có <b>{dueCount}</b> khách tới hạn liên hệ lại hôm nay hoặc đã quá hạn — bấm để xem danh
          sách cần gọi.
        </Link>
      )}

      <form className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        {dueOnly && <input type="hidden" name="due" value="1" />}
        <div className="grow min-w-48">
          <label className="block text-xs text-slate-500 mb-1">Tìm kiếm</label>
          <input
            name="q"
            defaultValue={sp.q || ""}
            placeholder="Tên, SĐT, khu vực, nhu cầu..."
            className={`${inputClass} w-full`}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Trạng thái</label>
          <select name="status" defaultValue={sp.status || ""} className={inputClass}>
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
          <label className="block text-xs text-slate-500 mb-1">Nguồn</label>
          <select name="source" defaultValue={sp.source || ""} className={inputClass}>
            <option value="">Tất cả</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Khu vực</label>
          <select name="area" defaultValue={sp.area || ""} className={inputClass}>
            <option value="">Tất cả</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Hình thức</label>
          <select name="mode" defaultValue={sp.mode || ""} className={inputClass}>
            <option value="">Tất cả</option>
            {Object.entries(LEARNING_MODE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Môn</label>
          <select name="subject" defaultValue={sp.subject || ""} className={inputClass}>
            <option value="">Tất cả</option>
            {SUBJECT_SUGGESTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-gold-600 hover:bg-gold-700 text-white text-sm font-medium rounded-lg px-4 py-2"
        >
          Lọc
        </button>
        <Link
          href="/admin/leads"
          className="text-sm text-slate-500 hover:text-slate-700 px-2 py-2"
        >
          Xoá lọc
        </Link>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">
            {dueOnly ? "Cần liên hệ hôm nay" : "Danh sách"} ({leads.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">Khách hàng</th>
                <th className="px-4 py-2.5 font-medium">Khu vực</th>
                <th className="px-4 py-2.5 font-medium">Nhu cầu</th>
                <th className="px-4 py-2.5 font-medium">Nguồn</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 font-medium">Liên hệ lại</th>
                <th className="px-4 py-2.5 font-medium">Phụ trách</th>
                <th className="px-4 py-2.5 font-medium text-right">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => {
                const overdue =
                  !!l.next_follow_up &&
                  l.next_follow_up <= today &&
                  l.status !== "won" &&
                  l.status !== "lost" &&
                  l.status !== "cold";
                return (
                  <tr key={l.id} className={overdue ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-slate-50"}>
                    <td className="px-4 py-2.5">
                      <ContactCell lead={l} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{l.area || "-"}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      <span className="block">
                        {l.subject} · {LEARNING_MODE_LABELS[l.learning_mode]}
                      </span>
                      {l.need && <span className="block text-xs text-slate-400">{l.need}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {l.source}
                      <span className="block text-xs text-slate-400">{l.received_at}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <LeadStatusBadge status={l.status} />
                    </td>
                    <td className={`px-4 py-2.5 ${overdue ? "text-amber-800 font-medium" : "text-slate-600"}`}>
                      {l.next_follow_up || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{l.owner_name || "-"}</td>
                    <td className="px-4 py-2.5 text-right text-slate-900">
                      {l.revenue > 0 ? formatVND(l.revenue) : "-"}
                    </td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Chưa có khách hàng nào khớp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <details className="bg-white rounded-xl border border-slate-200 p-4" open={all.length === 0}>
        <summary className="font-semibold text-slate-900 cursor-pointer">
          + Thêm khách hàng tiềm năng
        </summary>
        <div className="mt-4">
          <NewLeadForm staff={staff} currentUserId={session.userId} />
        </div>
      </details>
    </div>
  );
}
