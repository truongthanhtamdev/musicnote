import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/guard";
import {
  getClass,
  getLead,
  getPackage,
  getPackageProgress,
  listLeadNotes,
  listPaymentsForClass,
  listStaff,
  listTeachers,
} from "@/lib/queries";
import { formatTimeRange, formatVND, todayISO } from "@/lib/format";
import { DAY_LABELS, LEAD_NOTE_KIND_LABELS, LEARNING_MODE_LABELS, zaloLink } from "@/lib/types";
import { PageHeader } from "@/components/app-shell";
import { IconArrowRight, IconClock, IconPhone } from "@/components/icons";
import { LeadStatusBadge, LeadTemperatureBadge } from "../lead-badges";
import EditLeadForm from "./edit-lead-form";
import LeadNoteForm from "./lead-note-form";
import LeadStatusActions from "./status-actions";
import ConvertLeadForm from "./convert-form";
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
  const staff = listStaff().map((s) => ({ id: s.id, name: s.name }));
  const teachers = listTeachers(false).map((t) => ({ id: t.id, name: t.name }));
  const cls = lead.class_id ? getClass(lead.class_id) : undefined;
  const progress = cls ? getPackageProgress(cls) : null;
  const packageTotal = cls?.package_id ? (getPackage(cls.package_id)?.total_sessions ?? null) : null;
  const payments = cls ? listPaymentsForClass(cls.id) : [];
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
          <Field label="Nguồn">{lead.source}</Field>
          <Field label="Phụ trách">{lead.owner_name || "Chưa giao"}</Field>
        </div>

        <div className="mt-4 border-t border-line-soft pt-4">
          <LeadStatusActions leadId={lead.id} status={lead.status} canDelete={isAdmin} />
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          {cls ? (
            <div className="panel p-[18px]">
              <div className="flex items-center justify-between">
                <h2 className="panel-title">Lớp đã tạo từ khách này</h2>
                <Link
                  href={`/admin/classes/${cls.id}`}
                  className="text-[12.5px] font-medium text-brand-600 hover:underline"
                >
                  Mở lớp
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Field label="Học viên">{cls.student_name}</Field>
                <Field label="Lịch học">
                  {DAY_LABELS[cls.day_of_week]}{" "}
                  {formatTimeRange(cls.start_time, cls.duration_minutes)}
                </Field>
                <Field label="Giáo viên">{cls.teacher_name || "Chưa xếp"}</Field>
                <Field label="Gói học">
                  {progress ? `${progress.used}/${progress.total} tiết` : "Chưa mua gói"}
                </Field>
              </div>

              {isAdmin && (
                <div className="mt-4 border-t border-line-soft pt-4">
                  <h3 className="mb-3 text-[13px] font-semibold text-ink">Ghi nhận tiền học</h3>
                  <LeadPaymentForm
                    leadId={lead.id}
                    classId={cls.id}
                    subject={cls.subject}
                    packageTotal={packageTotal}
                  />
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
              )}
            </div>
          ) : (
            <div className="panel p-[18px]">
              <h2 className="panel-title">Chốt khách — tạo lớp học</h2>
              <p className="mt-2 mb-4 text-[13px] text-muted">
                Tạo lớp từ thông tin đã tư vấn. Lớp được gắn với khách này nên mọi khoản học phí
                sau đó đều quy được về đúng nguồn quảng cáo đã mang khách tới.
              </p>
              <ConvertLeadForm leadId={lead.id} defaultName={lead.name} teachers={teachers} />
            </div>
          )}

          <div className="panel p-[18px]">
            <h2 className="panel-title mb-4">Thông tin khách hàng</h2>
            <EditLeadForm lead={lead} staff={staff} />
          </div>
        </div>

        <div className="flex flex-col gap-5">
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
