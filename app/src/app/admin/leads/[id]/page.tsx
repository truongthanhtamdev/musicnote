import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/guard";
import {
  getLead,
  listAppointments,
  listLeadNotes,
  listPaymentsForLead,
  listServices,
  listStaff,
} from "@/lib/queries";
import { formatVND, todayISO } from "@/lib/format";
import { LEAD_NOTE_KIND_LABELS, LEARNING_MODE_LABELS, zaloLink } from "@/lib/types";
import { PageHeader } from "@/components/app-shell";
import { IconArrowRight, IconClock, IconPhone } from "@/components/icons";
import AppointmentForm from "@/components/appointment-form";
import AppointmentActions from "@/components/appointment-actions";
import { APPOINTMENT_KIND_LABELS, APPOINTMENT_STATUS_LABELS } from "@/lib/types";
import { shortDate, stampTime, vnToday, relativeToNow } from "@/lib/time";
import { LeadStatusBadge, LeadTemperatureBadge } from "../lead-badges";
import EditLeadForm from "./edit-lead-form";
import LeadNoteForm from "./lead-note-form";
import LeadStatusActions from "./status-actions";
import CloseWonForm from "./close-won-form";
import LeadPaymentForm from "./lead-payment-form";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11.5px] text-muted">{label}</p>
      <div className="mt-1 text-[13.5px] text-ink">{children}</div>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(["admin", "coordinator"]);
  const { id } = await params;
  const lead = getLead(Number(id));
  if (!lead) notFound();

  const notes = listLeadNotes(lead.id);
  const appointments = listAppointments({ leadId: lead.id });
  const staff = listStaff().map((s) => ({ id: s.id, name: s.name }));
  const services = listServices({ kind: "subject" }).map((s) => s.name);
  const fanpages = listServices({ kind: "fanpage" }).map((s) => ({ id: s.id, name: s.name }));
  const payments = listPaymentsForLead(lead.id, lead.class_id);
  const isAdmin = session.role === "admin";
  const isClosed = lead.status === "won" || lead.status === "lost" || lead.status === "cold";
  const overdue = !!lead.next_follow_up && lead.next_follow_up <= todayISO() && !isClosed;

  return (
    <>
      <Link
        href="/admin/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
      >
        ← Danh sách khách tiềm năng
      </Link>

      <PageHeader
        plain
        eyebrow={`${lead.source} · nhận ngày ${lead.received_at}`}
        title={lead.name}
        sub={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {lead.phone && (
              <a
                href={zaloLink(lead.phone)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:underline"
              >
                <IconPhone className="size-3.5" />
                Zalo {lead.phone}
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="hover:text-ink">
                Gọi điện
              </a>
            )}
            {lead.fb_url && (
              <a
                href={lead.fb_url}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-500 hover:underline"
              >
                {lead.fb_name || "Facebook"}
              </a>
            )}
          </span>
        }
        actions={
          <div className="text-right">
            <p className="text-[11.5px] text-muted">Doanh thu đã thu</p>
            <p className="text-[26px] font-bold leading-tight text-brand-700 tabular">
              {formatVND(lead.revenue)}
            </p>
            {lead.expected_value != null && lead.status !== "won" && (
              <p className="text-[11.5px] text-muted">
                Dự kiến {formatVND(lead.expected_value)}
              </p>
            )}
          </div>
        }
      />

      <div className="card p-[18px]">
        <div className="flex flex-wrap items-center gap-2">
          <LeadStatusBadge status={lead.status} />
          <LeadTemperatureBadge temperature={lead.temperature} />
          {lead.next_follow_up && (
            <span
              className={`badge ${overdue ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
            >
              <IconClock className="size-3.5" />
              {overdue ? "Tới hạn liên hệ" : "Hẹn liên hệ"} {lead.next_follow_up}
            </span>
          )}
          {lead.lost_reason && (
            <span className="badge bg-rose-50 text-rose-700">Lý do: {lead.lost_reason}</span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line-soft pt-4 md:grid-cols-4">
          <Field label="Khu vực">{lead.area || "—"}</Field>
          <Field label="Nhu cầu">
            {lead.subject} · {LEARNING_MODE_LABELS[lead.learning_mode]}
            {lead.need && <span className="block text-[12px] text-muted">{lead.need}</span>}
          </Field>
          <Field label="Fanpage / nguồn">
            {lead.project_name || "Chưa gắn fanpage"}
            <span className="block text-[12px] text-muted">{lead.source}</span>
          </Field>
          <Field label="Phụ trách">{lead.owner_name || "Chưa giao"}</Field>
        </div>

        <div className="mt-4 border-t border-line-soft pt-4">
          <LeadStatusActions leadId={lead.id} status={lead.status} canDelete={isAdmin} />
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <div className="panel p-[18px]">
            <div className="flex items-center justify-between">
              <h2 className="panel-title">Tiền của khách này</h2>
              <span className="text-[13px] font-bold text-brand-700 tabular">
                {formatVND(lead.revenue)}
              </span>
            </div>

            {lead.status !== "won" && (
              <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
                <h3 className="text-[13px] font-semibold text-ink">Khách đã đồng ý học?</h3>
                <p className="mb-3 mt-1 text-[12.5px] text-muted">
                  Chốt khách và ghi luôn khoản đầu tiên nếu đã thu.
                </p>
                <CloseWonForm leadId={lead.id} />
              </div>
            )}

            <div className="mt-4 border-t border-line-soft pt-4">
              <h3 className="mb-3 text-[13px] font-semibold text-ink">Ghi nhận thanh toán</h3>
              <LeadPaymentForm leadId={lead.id} classId={lead.class_id} />
              <div className="mt-3">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between border-b border-line-soft py-2 text-[13px] last:border-b-0"
                  >
                    <span className="text-muted">
                      {p.paid_at}
                      {p.note ? ` · ${p.note}` : ""}
                    </span>
                    <span className="font-semibold text-ink tabular">{formatVND(p.amount)}</span>
                  </div>
                ))}
                {payments.length === 0 && (
                  <p className="py-2 text-[13px] text-muted">Chưa thu khoản nào.</p>
                )}
              </div>
            </div>
          </div>

          <div className="panel p-[18px]">
            <h2 className="panel-title mb-4">Thông tin khách hàng</h2>
            <EditLeadForm lead={lead} staff={staff} services={services} fanpages={fanpages} />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="panel p-[18px]">
            <h2 className="panel-title mb-1">Đặt lịch hẹn</h2>
            <p className="mb-4 text-[12.5px] text-muted">
              Hệ thống sẽ nhắn Telegram nhắc bạn trước giờ hẹn.
            </p>
            <AppointmentForm leadId={lead.id} defaultDate={vnToday()} compact />
          </div>

          {appointments.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <div className="flex items-center gap-2.5">
                  <h2 className="panel-title">Lịch hẹn</h2>
                  <span className="chip">{appointments.length}</span>
                </div>
              </div>
              <div>
                {appointments.map((a) => (
                  <div key={a.id} className="border-b border-line-soft px-[18px] py-3 last:border-b-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-ink tabular">
                        {shortDate(a.starts_at.slice(0, 10))} {stampTime(a.starts_at)}
                      </span>
                      <span className="badge bg-brand-50 text-brand-700">
                        {APPOINTMENT_KIND_LABELS[a.kind]}
                      </span>
                      {a.status !== "scheduled" && (
                        <span className="badge bg-slate-100 text-slate-600">
                          {APPOINTMENT_STATUS_LABELS[a.status]}
                        </span>
                      )}
                      {a.status === "scheduled" && (
                        <span className="text-[12px] text-muted">{relativeToNow(a.starts_at)}</span>
                      )}
                    </div>
                    {(a.location || a.note) && (
                      <p className="mt-1 text-[12.5px] text-muted">
                        {[a.location, a.note].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="mt-2">
                      <AppointmentActions id={a.id} status={a.status} startsAt={a.starts_at} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="panel p-[18px]">
            <h2 className="panel-title mb-4">Thêm trao đổi</h2>
            <LeadNoteForm leadId={lead.id} />
          </div>

          <div className="panel">
            <div className="panel-head">
              <div className="flex items-center gap-2.5">
                <h2 className="panel-title">Lịch sử chăm sóc</h2>
                <span className="chip">{notes.length}</span>
              </div>
            </div>
            <div className="max-h-[32rem] overflow-y-auto">
              {notes.map((n) => (
                <div key={n.id} className="border-b border-line-soft px-[18px] py-3 last:border-b-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
                    <span
                      className={`badge ${
                        n.kind === "status"
                          ? "bg-brand-50 text-brand-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {LEAD_NOTE_KIND_LABELS[n.kind]}
                    </span>
                    <span className="tabular">{n.created_at}</span>
                    {n.user_name && <span>· {n.user_name}</span>}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] text-ink-soft">{n.body}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
                  <IconArrowRight className="size-5 text-brand-300" />
                  <p className="text-[13px] text-muted">
                    Chưa có trao đổi nào — ghi lại ngay sau mỗi lần gọi hoặc nhắn tin.
                  </p>
                </div>
              )}
            </div>
          </div>

          {lead.notes && (
            <div className="panel p-[18px]">
              <h2 className="panel-title mb-2">Ghi chú chung</h2>
              <p className="whitespace-pre-wrap text-[13.5px] text-ink-soft">{lead.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
