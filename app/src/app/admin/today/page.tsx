import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { countLeadsDue, getAgenda, listAppointments, listLeads } from "@/lib/queries";
import { getTelegramConfig } from "@/lib/settings";
import {
  longDate,
  relativeToNow,
  shortDate,
  stampTime,
  vnNowHHMM,
  vnToday,
  addMinutesToStamp,
  minutesOfDay,
} from "@/lib/time";
import { APPOINTMENT_KIND_LABELS, zaloLink } from "@/lib/types";
import { PageHeader } from "@/components/app-shell";
import AppointmentForm from "@/components/appointment-form";
import AppointmentActions from "@/components/appointment-actions";
import { IconArrowRight, IconClock, IconPhone } from "@/components/icons";

const STATUS_STYLES: Record<string, string> = {
  done: "bg-brand-50 text-brand-700",
  no_show: "bg-rose-50 text-rose-700",
  canceled: "bg-slate-100 text-slate-500",
};

function dayShift(iso: string, days: number): string {
  return addMinutesToStamp(`${iso} 12:00`, days * 1440).slice(0, 10);
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  await requireRole(["admin", "coordinator"]);
  const sp = await searchParams;
  const today = vnToday();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.d || "") ? sp.d! : today;
  const isToday = date === today;

  const agenda = getAgenda(date);
  const nowMinutes = minutesOfDay(vnNowHHMM());

  // Hẹn của những ngày trước còn treo: đây chính là những cái hay bị quên.
  const overdue = listAppointments({ toDate: dayShift(today, -1), pendingOnly: true });
  const dueLeads = listLeads({ dueOnly: true, order: "follow_up" });
  const leadOptions = listLeads({ status: "open", order: "recent" }).map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
  }));
  const telegramOn = !!getTelegramConfig()?.enabled;
  const pendingCount = agenda.filter(
    (i) => i.kind === "appointment" && i.status === "scheduled"
  ).length;

  return (
    <>
      <PageHeader
        eyebrow={longDate(date)}
        title={isToday ? "Hôm nay" : "Lịch ngày " + shortDate(date)}
        sub={
          isToday
            ? `${pendingCount} việc chưa xong · ${countLeadsDue()} khách tới hạn gọi lại`
            : `${agenda.length} mục trong ngày`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/today?d=${dayShift(date, -1)}`} className="btn btn-ghost btn-sm">
              ← Hôm trước
            </Link>
            <Link href="/admin/today" className="btn btn-ghost btn-sm">
              Hôm nay
            </Link>
            <Link href={`/admin/today?d=${dayShift(date, 1)}`} className="btn btn-ghost btn-sm">
              Hôm sau →
            </Link>
          </div>
        }
      />

      {!telegramOn && (
        <Link href="/admin/settings" className="alert mb-5">
          <IconClock className="size-4 shrink-0" />
          <span>
            Chưa bật nhắc việc qua Telegram — bật để không phải nhớ lịch trong đầu nữa
          </span>
          <IconArrowRight className="ml-auto size-4 shrink-0" />
        </Link>
      )}

      {overdue.length > 0 && (
        <div className="panel mb-5 border-amber-200">
          <div className="panel-head bg-amber-50/60">
            <h2 className="panel-title text-amber-900">
              {overdue.length} hẹn cũ chưa đánh dấu xong
            </h2>
          </div>
          <div>
            {overdue.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-[18px] py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink">
                    {a.lead_id ? (
                      <Link href={`/admin/leads/${a.lead_id}`} className="hover:text-brand-700">
                        {a.lead_name || a.title || "Khách"}
                      </Link>
                    ) : (
                      a.title || "Việc khác"
                    )}
                  </p>
                  <p className="text-[12px] text-muted">
                    {APPOINTMENT_KIND_LABELS[a.kind]} · {shortDate(a.starts_at.slice(0, 10))}{" "}
                    {stampTime(a.starts_at)} · {relativeToNow(a.starts_at)}
                  </p>
                </div>
                <AppointmentActions id={a.id} status={a.status} startsAt={a.starts_at} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel">
          <div className="panel-head">
            <div className="flex items-center gap-2.5">
              <h2 className="panel-title">Lịch trong ngày</h2>
              <span className="chip">{agenda.length}</span>
            </div>
            {isToday && <span className="text-[12px] text-muted tabular">Bây giờ {vnNowHHMM()}</span>}
          </div>

          {agenda.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
              <IconClock className="size-7 text-brand-300" />
              <p className="text-[14px] font-semibold text-ink">Ngày này chưa có lịch nào</p>
              <p className="text-[12.5px] text-muted">
                Đặt lịch ở khung bên phải — hệ thống sẽ nhắc bạn trước giờ hẹn.
              </p>
            </div>
          ) : (
            <div>
              {agenda.map((item, idx) => {
                const start = minutesOfDay(item.time);
                const end = start + item.durationMinutes;
                const running = isToday && nowMinutes >= start && nowMinutes < end;
                const pendingNow =
                  item.kind === "appointment" && item.status === "scheduled";
                const missed = isToday && pendingNow && nowMinutes >= end;

                return (
                  <div
                    key={`${item.kind}-${idx}`}
                    className={`flex flex-wrap items-start gap-4 border-b border-line-soft px-[18px] py-3.5 last:border-b-0 ${
                      running ? "bg-brand-50/60" : missed ? "bg-amber-50/60" : ""
                    }`}
                  >
                    <div className="w-14 shrink-0">
                      <p className="text-[15px] font-bold text-ink tabular">{item.time}</p>
                      <p className="text-[11px] text-muted tabular">{item.durationMinutes}′</p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13.5px] font-semibold text-ink">
                          {item.href ? (
                            <Link href={item.href} className="hover:text-brand-700">
                              {item.title}
                            </Link>
                          ) : (
                            item.title
                          )}
                        </p>
                        {item.kind === "appointment" && item.appointment && (
                          <span className="badge bg-brand-50 text-brand-700">
                            {APPOINTMENT_KIND_LABELS[item.appointment.kind]}
                          </span>
                        )}
                        {item.kind === "class" && (
                          <span className="badge bg-slate-100 text-slate-600">Lớp học</span>
                        )}
                        {item.status && item.status !== "scheduled" && (
                          <span className={`badge ${STATUS_STYLES[item.status]}`}>
                            {item.status === "done"
                              ? "Đã xong"
                              : item.status === "no_show"
                                ? "Khách không đến"
                                : "Đã huỷ"}
                          </span>
                        )}
                        {running && (
                          <span className="badge bg-brand-600 text-white">Đang diễn ra</span>
                        )}
                        {missed && !running && (
                          <span className="badge bg-amber-100 text-amber-800">Chưa đánh dấu</span>
                        )}
                      </div>

                      <p className="mt-0.5 text-[12px] text-muted">
                        {[
                          item.subtitle,
                          item.appointment?.location,
                          item.appointment?.note,
                          isToday && pendingNow
                            ? relativeToNow(`${date} ${item.time}`)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>

                      {item.appointment && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {item.appointment.lead_phone && (
                            <a
                              href={zaloLink(item.appointment.lead_phone)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm"
                            >
                              <IconPhone className="size-3.5" />
                              Zalo
                            </a>
                          )}
                          {item.appointment.lead_fb_url && (
                            <a
                              href={item.appointment.lead_fb_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm"
                            >
                              Facebook
                            </a>
                          )}
                          <AppointmentActions
                            id={item.appointment.id}
                            status={item.appointment.status}
                            startsAt={item.appointment.starts_at}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="panel p-[18px]">
            <h2 className="panel-title mb-4">Đặt lịch hẹn</h2>
            <AppointmentForm leads={leadOptions} defaultDate={date} compact />
          </div>

          <div className="panel">
            <div className="panel-head">
              <div className="flex items-center gap-2.5">
                <h2 className="panel-title">Khách chờ gọi lại</h2>
                <span className="chip">{dueLeads.length}</span>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {dueLeads.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-3 border-b border-line-soft px-[18px] py-2.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/leads/${l.id}`}
                      className="text-[13px] font-medium text-ink hover:text-brand-700"
                    >
                      {l.name}
                    </Link>
                    <p className="text-[11.5px] text-muted">
                      hẹn {shortDate(l.next_follow_up!)} · {l.area || "chưa rõ khu vực"}
                    </p>
                  </div>
                  {l.phone && (
                    <a
                      href={zaloLink(l.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-sm"
                    >
                      Zalo
                    </a>
                  )}
                </div>
              ))}
              {dueLeads.length === 0 && (
                <p className="px-[18px] py-8 text-center text-[13px] text-muted">
                  Không còn khách nào tới hạn. Gọn gàng!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
