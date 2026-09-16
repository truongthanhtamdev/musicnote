import { db } from "./db";
import { countLeadsDue, listAppointments, listLeads } from "./queries";
import { getDigestTime, getSetting, getTelegramConfig, setSetting } from "./settings";
import { esc, sendTelegram } from "./telegram";
import {
  addMinutesToStamp,
  longDate,
  relativeToNow,
  stampTime,
  vnNowHHMM,
  vnNowStamp,
  vnToday,
} from "./time";
import { APPOINTMENT_KIND_LABELS, SETTING_KEYS, type AppointmentRow } from "./types";

function baseUrl(): string {
  return (getSetting(SETTING_KEYS.appBaseUrl) || process.env.APP_BASE_URL || "").replace(/\/$/, "");
}

function linkLine(leadId: number | null): string {
  const base = baseUrl();
  if (!base) return "";
  return leadId ? `\n${base}/admin/leads/${leadId}` : `\n${base}/admin/today`;
}

function apptMessage(a: AppointmentRow & { lead_name?: string | null; lead_phone?: string | null }): string {
  const lines = [
    `⏰ <b>${stampTime(a.starts_at)} · ${APPOINTMENT_KIND_LABELS[a.kind]}</b> (${relativeToNow(a.starts_at)})`,
    a.lead_name ? `👤 ${esc(a.lead_name)}${a.lead_phone ? ` — ${esc(a.lead_phone)}` : ""}` : null,
    a.title ? `📌 ${esc(a.title)}` : null,
    a.location ? `📍 ${esc(a.location)}` : null,
    a.note ? `📝 ${esc(a.note)}` : null,
  ].filter(Boolean);
  return lines.join("\n") + linkLine(a.lead_id);
}

/** Nhắc từng lịch hẹn tới giờ. Đã nhắc rồi thì thôi, nhờ cột reminded_at. */
async function sendDueReminders(now: Date): Promise<number> {
  const nowStamp = vnNowStamp(now);
  const rows = db
    .prepare(
      `SELECT a.*, l.name as lead_name, l.phone as lead_phone
       FROM appointments a LEFT JOIN leads l ON l.id = a.lead_id
       WHERE a.status = 'scheduled' AND a.reminded_at IS NULL AND a.starts_at >= @floor
       ORDER BY a.starts_at`
    )
    // Bỏ qua hẹn đã quá 12 tiếng: nhắc lúc đó chỉ gây nhiễu, và tránh việc
    // bật tính năng lên là bắn một loạt tin về những hẹn cũ.
    .all({ floor: addMinutesToStamp(nowStamp, -720) }) as (AppointmentRow & {
    lead_name: string | null;
    lead_phone: string | null;
  })[];

  let sent = 0;
  for (const a of rows) {
    const remindAt = addMinutesToStamp(a.starts_at, -a.remind_minutes);
    if (remindAt > nowStamp) continue;

    const res = await sendTelegram(apptMessage(a));
    if (!res.ok) {
      console.error("[nhắc lịch] gửi Telegram lỗi:", res.error);
      continue;
    }
    db.prepare("UPDATE appointments SET reminded_at = ? WHERE id = ?").run(nowStamp, a.id);
    sent++;
  }
  return sent;
}

/** Bản tóm tắt đầu ngày: cả ngày có gì và ai đang chờ mình gọi lại. */
export function buildDigest(today: string = vnToday()): string {
  const appts = listAppointments({ fromDate: today, toDate: today, pendingOnly: true });
  const overdue = listAppointments({ toDate: today, pendingOnly: true }).filter(
    (a) => a.starts_at < `${today} 00:00`
  );
  const dueLeads = listLeads({ dueOnly: true, order: "follow_up" });

  const lines = [`📅 <b>Lịch hôm nay — ${longDate(today)}</b>`];

  if (appts.length === 0) {
    lines.push("\nHôm nay chưa có lịch hẹn nào.");
  } else {
    lines.push("");
    for (const a of appts) {
      lines.push(
        `• <b>${stampTime(a.starts_at)}</b> ${APPOINTMENT_KIND_LABELS[a.kind]} — ${esc(
          a.lead_name || a.title || "Khách"
        )}${a.lead_phone ? ` (${esc(a.lead_phone)})` : ""}`
      );
    }
  }

  if (overdue.length > 0) {
    lines.push(`\n⚠️ <b>${overdue.length} hẹn cũ chưa đánh dấu xong</b>`);
    for (const a of overdue.slice(0, 5)) {
      lines.push(`• ${a.starts_at} — ${esc(a.lead_name || a.title || "Khách")}`);
    }
  }

  if (dueLeads.length > 0) {
    lines.push(`\n📞 <b>${dueLeads.length} khách tới hạn liên hệ lại</b>`);
    for (const l of dueLeads.slice(0, 8)) {
      lines.push(`• ${esc(l.name)}${l.phone ? ` — ${esc(l.phone)}` : ""}`);
    }
  }

  const base = baseUrl();
  if (base) lines.push(`\n${base}/admin/today`);
  return lines.join("\n");
}

async function sendDailyDigest(now: Date): Promise<boolean> {
  const today = vnToday(now);
  if (getSetting(SETTING_KEYS.lastDigestDate) === today) return false;
  if (vnNowHHMM(now) < getDigestTime()) return false;

  const res = await sendTelegram(buildDigest(today));
  if (!res.ok) {
    console.error("[tóm tắt ngày] gửi Telegram lỗi:", res.error);
    return false;
  }
  setSetting(SETTING_KEYS.lastDigestDate, today);
  return true;
}

/**
 * Một nhịp kiểm tra, chạy mỗi phút. Không bao giờ ném lỗi ra ngoài để một lần
 * mạng chập không giết luôn vòng lặp nhắc việc.
 */
export async function runReminderTick(now: Date = new Date()): Promise<void> {
  try {
    const cfg = getTelegramConfig();
    if (!cfg || !cfg.enabled) return;
    await sendDueReminders(now);
    await sendDailyDigest(now);
  } catch (err) {
    console.error("[nhắc lịch] lỗi không mong đợi:", err);
  }
}

/** Số việc còn treo, dùng cho huy hiệu trên thanh điều hướng. */
export function countTodayWork(today: string = vnToday()): number {
  return (
    listAppointments({ toDate: today, pendingOnly: true }).length + countLeadsDue()
  );
}
