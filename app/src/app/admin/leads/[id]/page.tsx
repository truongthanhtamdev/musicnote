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
import {
  DAY_LABELS,
  LEAD_NOTE_KIND_LABELS,
  LEARNING_MODE_LABELS,
  zaloLink,
} from "@/lib/types";
import { LeadStatusBadge, LeadTemperatureBadge } from "../lead-badges";
import EditLeadForm from "./edit-lead-form";
import LeadNoteForm from "./lead-note-form";
import LeadStatusActions from "./status-actions";
import ConvertLeadForm from "./convert-form";
import LeadPaymentForm from "./lead-payment-form";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-900 mt-0.5">{children}</p>
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
  const overdue =
    !!lead.next_follow_up &&
    lead.next_follow_up <= todayISO() &&
    lead.status !== "won" &&
    lead.status !== "lost" &&
    lead.status !== "cold";

  return (
    <div className="space-y-6">
      <Link href="/admin/leads" className="text-sm text-slate-500 hover:text-slate-700">
        ← Danh sách khách hàng tiềm năng
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{lead.name}</h1>
              <LeadStatusBadge status={lead.status} />
              <LeadTemperatureBadge temperature={lead.temperature} />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm">
              {lead.phone && (
                <a
                  href={zaloLink(lead.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 hover:underline"
                >
                  Zalo {lead.phone}
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="text-slate-600 hover:underline">
                  Gọi điện
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
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-slate-500">Doanh thu đã thu</p>
            <p className="text-xl font-bold text-emerald-600">{formatVND(lead.revenue)}</p>
            {lead.expected_value != null && lead.status !== "won" && (
              <p className="text-xs text-slate-400">Dự kiến {formatVND(lead.expected_value)}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-100 pt-4">
          <Field label="Khu vực">{lead.area || "-"}</Field>
          <Field label="Nhu cầu">
            {lead.subject} · {LEARNING_MODE_LABELS[lead.learning_mode]}
            {lead.need && <span className="block text-xs text-slate-500">{lead.need}</span>}
          </Field>
          <Field label="Nguồn">
            {lead.source}
            <span className="block text-xs text-slate-500">nhận ngày {lead.received_at}</span>
          </Field>
          <Field label="Phụ trách">{lead.owner_name || "Chưa giao"}</Field>
        </div>

        {(lead.next_follow_up || lead.lost_reason) && (
          <div className="flex flex-wrap gap-3 text-sm border-t border-slate-100 pt-4">
            {lead.next_follow_up && (
              <span
                className={`rounded-lg px-3 py-1.5 ${
                  overdue ? "bg-amber-50 text-amber-800 font-medium" : "bg-slate-50 text-slate-600"
                }`}
              >
                {overdue ? "⏰ Tới hạn liên hệ lại: " : "Hẹn liên hệ lại: "}
                {lead.next_follow_up}
              </span>
            )}
            {lead.lost_reason && (
              <span className="rounded-lg px-3 py-1.5 bg-red-50 text-red-700">
                Lý do không chốt: {lead.lost_reason}
              </span>
            )}
          </div>
        )}

        <div className="border-t border-slate-100 pt-4">
          <LeadStatusActions leadId={lead.id} status={lead.status} canDelete={isAdmin} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          {cls ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Lớp đã tạo từ khách này</h2>
                <Link href={`/admin/classes/${cls.id}`} className="text-sm text-gold-600 hover:underline">
                  Mở lớp
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Học viên">{cls.student_name}</Field>
                <Field label="Lịch học">
                  {DAY_LABELS[cls.day_of_week]} {formatTimeRange(cls.start_time, cls.duration_minutes)}
                </Field>
                <Field label="Giáo viên">{cls.teacher_name || "Chưa xếp"}</Field>
                <Field label="Gói học">
                  {progress ? `${progress.used}/${progress.total} tiết` : "Chưa mua gói"}
                </Field>
              </div>

              {isAdmin && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">Ghi nhận tiền học</h3>
                  <LeadPaymentForm
                    leadId={lead.id}
                    classId={cls.id}
                    subject={cls.subject}
                    packageTotal={packageTotal}
                  />
                  <div className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <div key={p.id} className="py-2 text-sm flex justify-between">
                        <span className="text-slate-600">
                          {p.paid_at}
                          {p.note ? ` · ${p.note}` : ""}
                        </span>
                        <span className="font-medium text-slate-900">{formatVND(p.amount)}</span>
                      </div>
                    ))}
                    {payments.length === 0 && (
                      <p className="text-sm text-slate-500 py-2">Chưa thu khoản nào.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <h2 className="font-semibold text-slate-900">Chốt khách — tạo lớp học</h2>
              <p className="text-sm text-slate-500">
                Tạo lớp từ thông tin đã tư vấn. Lớp được gắn với khách này nên mọi khoản học phí
                sau đó đều quy được về đúng nguồn quảng cáo đã mang khách tới.
              </p>
              <ConvertLeadForm leadId={lead.id} defaultName={lead.name} teachers={teachers} />
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Thông tin khách hàng</h2>
            <EditLeadForm lead={lead} staff={staff} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Thêm trao đổi</h2>
            <LeadNoteForm leadId={lead.id} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Lịch sử chăm sóc ({notes.length})</h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
              {notes.map((n) => (
                <div key={n.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span
                      className={`font-medium px-1.5 py-0.5 rounded ${
                        n.kind === "status" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {LEAD_NOTE_KIND_LABELS[n.kind]}
                    </span>
                    <span>{n.created_at}</span>
                    {n.user_name && <span>· {n.user_name}</span>}
                  </div>
                  <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{n.body}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-sm text-slate-500 px-4 py-6 text-center">
                  Chưa có trao đổi nào được ghi lại.
                </p>
              )}
            </div>
          </div>

          {lead.notes && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-2">Ghi chú chung</h2>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
