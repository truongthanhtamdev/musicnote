import { db } from "./db";
import { contactEmailOf, lessonReminderMail, mailEnabled, sendMail } from "./mail";
import { addDays, formatTimeRange, now, toISODate, toMinutesOfDay } from "./format";
import {
  annotateSchedule,
  isTeacherAvailable,
  listClasses,
  listPlannedSessions,
  listSessionsOn,
  listTeachers,
  teacherSpeaksLanguage,
  teacherTeachesSubject,
  type ScheduledSession,
} from "./queries";
import { SITE_URL } from "./seo";
import { escapeHtml, pruneTelegramLog, sendToUser, staffLinkedSql, telegramEnabled } from "./telegram";
import { DAY_LABELS, formatClassSchedule } from "./types";

/**
 * Lịch nhắc tự động qua Telegram, do chính app chạy — không cần cài cron trên
 * máy chủ, giống hệt cách sao lưu hằng ngày đang làm.
 *
 * Hai loại tin:
 *   1. Trước giờ học khoảng một tiếng — để giáo viên kịp chuẩn bị và học viên
 *      kịp bật máy.
 *   2. Tối hôm trước — toàn bộ lịch ngày mai, để ai bận thì còn kịp xin dời.
 *
 * Mỗi tin có một mã chống trùng lưu trong cơ sở dữ liệu, nên deploy lại giữa
 * chừng cũng không ai nhận hai lần.
 */

const TICK_MS = 5 * 60 * 1000;
const FIRST_TICK_MS = 45 * 1000;
/** Nhắc trước giờ học bao nhiêu phút. */
const LEAD_MINUTES = 60;
/** Từ giờ này trở đi trong ngày thì gửi lịch của ngày mai. */
const DIGEST_HOUR = 20;
/** Buổi sáng, từ giờ này: tổng hợp các lớp còn chờ giao giáo viên. */
const MORNING_HOUR = 8;
/** Lớp tạo trong bấy nhiêu giờ gần đây mới báo "lớp mới chờ giao". */
const NEW_CLASS_HOURS = 24;
const MINUTES_PER_DAY = 24 * 60;

declare global {
  var __musicnoteTelegramReminders: boolean | undefined;
}

/** "T5 25/09" — đủ để nhận ra ngày mà không dài dòng. */
function dayLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  return `${DAY_LABELS[d.getDay()]} ${dateISO.slice(8, 10)}/${dateISO.slice(5, 7)}`;
}

function timeRange(s: ScheduledSession): string {
  return formatTimeRange(s.time, s.cls.duration_minutes);
}

/** Tên khách để gọi trong tin nhắn: phụ huynh đứng tên thì gọi tên học viên. */
function studentLabel(s: ScheduledSession): string {
  return escapeHtml(s.cls.student_name);
}

/** Tin gửi giáo viên thì dùng tên giáo viên tự đặt cho học viên, nếu có. */
function teacherStudentLabel(s: ScheduledSession): string {
  return escapeHtml(s.cls.teacher_label || s.cls.student_name);
}

function meetingLine(s: ScheduledSession): string {
  return s.cls.meeting_url ? `\n🔗 <a href="${escapeHtml(s.cls.meeting_url)}">Vào phòng học</a>` : "";
}

function movedNote(s: ScheduledSession): string {
  return s.moved ? "\n<i>(buổi học bù đã dời sang hôm nay)</i>" : "";
}

/* ------------------------------------------------------------------ */
/* Học thử — nhắc cho quản lý + giáo vụ đặt hẹn                           */
/* ------------------------------------------------------------------ */

/**
 * Buổi học thử: lớp trung tâm vừa giao (hoặc đang ở bước "Học thử") mà chưa
 * dạy buổi nào. Đã dạy rồi thì các buổi sau là buổi thường, dù giáo vụ chưa
 * kịp đổi trạng thái.
 */
export function isTrialSession(s: ScheduledSession): boolean {
  if (!s.cls.trial_pending && s.cls.stage !== "trial") return false;
  return !db.prepare("SELECT 1 FROM attendance WHERE class_id = ? AND status = 'completed' LIMIT 1").get(s.cls.id);
}

/** Quản lý / chủ trung tâm đã nối Telegram, cộng người đặt hẹn khách này. */
function trialWatchers(s: ScheduledSession): number[] {
  const ids = new Set(
    (
      db
        .prepare(`SELECT id FROM users WHERE role IN ('admin','manager') AND active = 1 AND ${staffLinkedSql()}`)
        .all() as { id: number }[]
    ).map((r) => r.id)
  );
  if (s.cls.coordinator_id) ids.add(s.cls.coordinator_id);
  return [...ids];
}

function phoneLine(s: ScheduledSession): string {
  return s.cls.student_phone ? `\n📞 ${escapeHtml(s.cls.student_phone)}` : "";
}

/* ------------------------------------------------------------------ */
/* Lớp chờ giao giáo viên — nhắc quản lý                                 */
/* ------------------------------------------------------------------ */

function managerIds(): number[] {
  return (
    db
      .prepare(`SELECT id FROM users WHERE role IN ('admin','manager') AND active = 1 AND ${staffLinkedSql()}`)
      .all() as { id: number }[]
  ).map((r) => r.id);
}

interface WaitingClass {
  id: number;
  name: string;
  line: string;
  /** Buổi học gần nhất (YYYY-MM-DD), null nếu lớp linh động chưa hẹn buổi nào. */
  next: string | null;
  createdAt: string;
}

/** Lớp đang học mà chưa có giáo viên, buổi gần nhất lên đầu — giống trang Giao lớp. */
function waitingClasses(todayISO: string): WaitingClass[] {
  const classes = listClasses({ unassignedOnly: true, status: "active" });
  if (classes.length === 0) return [];
  const teachers = listTeachers(false);
  const until = toISODate(addDays(new Date(`${todayISO}T00:00:00`), 60));
  return annotateSchedule(classes)
    .map((c) => {
      const next =
        c.schedule_type === "flexible"
          ? (listPlannedSessions(c.id, todayISO, until)[0]?.session_date ?? null)
          : c.nextSessionDate || null;
      const free = teachers.filter(
        (t) =>
          teacherTeachesSubject(t, c.subject) &&
          teacherSpeaksLanguage(t, c.language) &&
          (c.schedule_type === "flexible" ||
            isTeacherAvailable(t.id, c.day_of_week, c.start_time, c.duration_minutes, c.id))
      ).length;
      const days = next
        ? Math.round((new Date(`${next}T00:00:00`).getTime() - new Date(`${todayISO}T00:00:00`).getTime()) / 86_400_000)
        : null;
      const when =
        days === null ? "chưa có buổi hẹn" : days === 0 ? "⚠️ học HÔM NAY" : days === 1 ? "⚠️ học NGÀY MAI" : `buổi đầu ${dayLabel(next!)}`;
      return {
        id: c.id,
        name: c.student_name,
        next,
        createdAt: c.created_at,
        line:
          `• <b>${escapeHtml(c.student_name)}</b> · ${escapeHtml(c.subject)} · ${escapeHtml(formatClassSchedule(c))}\n` +
          `   ${when} · ${free > 0 ? `${free} GV rảnh, hợp môn` : "chưa có GV nào rảnh, hợp môn"}`,
      };
    })
    .sort((a, b) => (a.next && b.next ? a.next.localeCompare(b.next) : a.next ? -1 : b.next ? 1 : 0));
}

const ASSIGN_LINK = `\n\n👉 <a href="${SITE_URL}/admin/assign">Mở trang Giao lớp</a>`;

/**
 * Ba loại tin cho quản lý:
 *   1. Lớp mới tạo mà chưa có giáo viên — báo ngay (trong vòng 5 phút).
 *   2. Lớp sắp học trong hôm nay / ngày mai mà vẫn chưa có giáo viên — báo
 *      một lần mỗi buổi, để kịp xếp người.
 *   3. 8h sáng: tổng hợp mọi lớp còn chờ giao, buổi gần nhất lên đầu.
 */
async function remindUnassigned(current: Date) {
  const managers = managerIds();
  if (managers.length === 0) return;
  const todayISO = toISODate(current);
  const waiting = waitingClasses(todayISO);
  if (waiting.length === 0) return;
  const tomorrowISO = toISODate(addDays(current, 1));
  // created_at lưu theo giờ UTC của SQLite.
  const newSince = new Date(Date.now() - NEW_CLASS_HOURS * 3600_000).toISOString().slice(0, 19).replace("T", " ");

  for (const w of waiting) {
    for (const id of managers) {
      if (w.createdAt >= newSince) {
        await sendToUser(id, `🆕 <b>Lớp mới chờ giao giáo viên</b>\n${w.line}${ASSIGN_LINK}`, `cho-giao-moi|${w.id}|${id}`);
      }
      if (w.next && w.next <= tomorrowISO) {
        await sendToUser(
          id,
          `🚨 <b>Lớp sắp học mà chưa có giáo viên</b>\n${w.line}${ASSIGN_LINK}`,
          `cho-giao-gap|${w.id}|${w.next}|${id}`
        );
      }
    }
  }

  if (current.getHours() >= MORNING_HOUR) {
    for (const id of managers) {
      await sendToUser(
        id,
        `📋 <b>${waiting.length} lớp đang chờ giao giáo viên</b>\n${waiting
          .slice(0, 15)
          .map((w) => w.line)
          .join("\n")}${waiting.length > 15 ? `\n… và ${waiting.length - 15} lớp nữa` : ""}${ASSIGN_LINK}`,
        `cho-giao-sang|${todayISO}|${id}`
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Nhắc trước giờ học                                                   */
/* ------------------------------------------------------------------ */

async function remindBeforeLessons(current: Date) {
  const minutesNow = current.getHours() * 60 + current.getMinutes();
  const upcoming = listSessionsOn(toISODate(current)).map((s) => ({
    s,
    minutesAway: toMinutesOfDay(s.time) - minutesNow,
  }));

  // Buổi bắt đầu ngay sau nửa đêm: lúc cần nhắc thì đồng hồ vẫn đang ở ngày
  // hôm trước, nên phải ngó sang lịch ngày mai — không thì lớp giờ đó không
  // bao giờ nhận được lời nhắc nào.
  if (minutesNow + LEAD_MINUTES >= MINUTES_PER_DAY) {
    for (const s of listSessionsOn(toISODate(addDays(current, 1)))) {
      upcoming.push({ s, minutesAway: toMinutesOfDay(s.time) + MINUTES_PER_DAY - minutesNow });
    }
  }

  for (const { s, minutesAway } of upcoming) {
    // Đã qua giờ thì thôi; còn xa hơn mốc thì để lượt kiểm tra sau lo.
    if (minutesAway <= 0 || minutesAway > LEAD_MINUTES) continue;

    const subject = escapeHtml(s.cls.subject);
    const key = `truoc|${s.cls.id}|${s.date}|${s.time}`;

    if (s.cls.teacher_id) {
      await sendToUser(
        s.cls.teacher_id,
        `⏰ <b>Sắp tới giờ dạy</b>\n` +
          `${timeRange(s)} · ${subject}\n` +
          `Học viên: ${teacherStudentLabel(s)}` +
          movedNote(s) +
          meetingLine(s),
        `${key}|gv${s.cls.teacher_id}`
      );
    }

    if (isTrialSession(s)) {
      for (const staffId of trialWatchers(s)) {
        await sendToUser(
          staffId,
          `🎯 <b>Sắp tới buổi học thử</b>\n` +
            `${timeRange(s)} · ${subject}\n` +
            `Khách: ${studentLabel(s)}` +
            (s.cls.teacher_name ? `\nGiáo viên: ${escapeHtml(s.cls.teacher_name)}` : "\n⚠️ Chưa xếp giáo viên") +
            phoneLine(s) +
            `\nNhắc khách vào học đúng giờ nhé.`,
          `${key}|thu${staffId}`
        );
      }
    }

    if (s.cls.student_user_id) {
      // Email nhắc kèm link Google Meet, cho khách không dùng Telegram.
      const email = contactEmailOf(s.cls.student_user_id);
      if (email) {
        await sendMail({
          to: email,
          ...lessonReminderMail({
            name: s.cls.student_name,
            subject: s.cls.subject,
            when: timeRange(s),
            meetingUrl: s.cls.meeting_url,
          }),
          dedupKey: `${key}|hv${s.cls.student_user_id}`,
        });
      }
      const teacher = s.cls.teacher_name ? `\nGiáo viên: ${escapeHtml(s.cls.teacher_name)}` : "";
      await sendToUser(
        s.cls.student_user_id,
        `⏰ <b>Sắp tới giờ học</b>\n` +
          `${timeRange(s)} · ${subject}` +
          teacher +
          movedNote(s) +
          meetingLine(s),
        `${key}|hv${s.cls.student_user_id}`
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Lịch ngày mai, gửi vào buổi tối                                      */
/* ------------------------------------------------------------------ */

async function sendTomorrowDigest(tomorrowISO: string) {
  const sessions = listSessionsOn(tomorrowISO);
  if (sessions.length === 0) return;

  const forTeacher = new Map<number, string[]>();
  const forStudent = new Map<number, string[]>();

  const push = (map: Map<number, string[]>, id: number, line: string) => {
    const list = map.get(id);
    if (list) list.push(line);
    else map.set(id, [line]);
  };

  for (const s of sessions) {
    const subject = escapeHtml(s.cls.subject);
    const moved = s.moved ? " (học bù)" : "";
    if (s.cls.teacher_id) {
      push(forTeacher, s.cls.teacher_id, `• ${timeRange(s)} · ${subject} — ${teacherStudentLabel(s)}${moved}`);
    }
    if (s.cls.student_user_id) {
      const teacher = s.cls.teacher_name ? ` với ${escapeHtml(s.cls.teacher_name)}` : "";
      push(forStudent, s.cls.student_user_id, `• ${timeRange(s)} · ${subject}${teacher}${moved}`);
    }
  }

  const label = dayLabel(tomorrowISO);

  // Khách học thử ngày mai — gửi quản lý và người đặt hẹn để gọi nhắc khách.
  const forStaff = new Map<number, string[]>();
  for (const s of sessions) {
    if (!isTrialSession(s)) continue;
    const teacher = s.cls.teacher_name ? `GV ${escapeHtml(s.cls.teacher_name)}` : "⚠️ chưa xếp GV";
    const phone = s.cls.student_phone ? ` · ${escapeHtml(s.cls.student_phone)}` : "";
    for (const staffId of trialWatchers(s)) {
      push(forStaff, staffId, `• ${timeRange(s)} · ${escapeHtml(s.cls.subject)} — ${studentLabel(s)}${phone} (${teacher})`);
    }
  }
  for (const [staffId, lines] of forStaff) {
    await sendToUser(
      staffId,
      `🎯 <b>Học thử ngày mai — ${label}</b>\n${lines.join("\n")}\n\nGọi / nhắn nhắc khách giúp nhé.`,
      `thu-ngay-mai|${staffId}|${tomorrowISO}`
    );
  }

  for (const [teacherId, lines] of forTeacher) {
    await sendToUser(
      teacherId,
      `📅 <b>Lịch dạy ngày mai — ${label}</b>\n${lines.join("\n")}`,
      `ngay-mai|gv${teacherId}|${tomorrowISO}`
    );
  }
  for (const [studentId, lines] of forStudent) {
    await sendToUser(
      studentId,
      `📅 <b>Lịch học ngày mai — ${label}</b>\n${lines.join("\n")}\n\n` +
        `Bận đột xuất thì nhắn trung tâm sớm giúp em nhé.`,
      `ngay-mai|hv${studentId}|${tomorrowISO}`
    );
  }
}

/* ------------------------------------------------------------------ */

async function tick() {
  if (!telegramEnabled() && !mailEnabled()) return;
  try {
    const current = now();

    await remindBeforeLessons(current);
    if (telegramEnabled()) await remindUnassigned(current);

    if (telegramEnabled() && current.getHours() >= DIGEST_HOUR) {
      await sendTomorrowDigest(toISODate(addDays(current, 1)));
      pruneTelegramLog();
    }
  } catch (e) {
    // Nhắc lịch hỏng thì ghi log rồi thôi — không được làm sập máy chủ web.
    console.error("[telegram] vòng nhắc lịch hỏng:", e);
  }
}

export function startTelegramReminders() {
  // Chạy khi có Telegram HOẶC có email: nhắc trước giờ học gửi qua cả hai.
  if (!telegramEnabled() && !mailEnabled()) return;
  if (globalThis.__musicnoteTelegramReminders) return;
  globalThis.__musicnoteTelegramReminders = true;

  // unref: bộ hẹn giờ không giữ tiến trình sống, máy chủ HTTP lo việc đó.
  setTimeout(() => void tick(), FIRST_TICK_MS).unref();
  setInterval(() => void tick(), TICK_MS).unref();
  console.log("[telegram] đã bật lịch nhắc tự động");
}

/* ------------------------------------------------------------------ */
/* Xem trước cho người quản lý                                          */
/* ------------------------------------------------------------------ */

/**
 * Gửi ngay lịch ngày mai của CẢ TRUNG TÂM cho một người quản lý.
 *
 * Có nút này vì lời nhắc thật chỉ chạy lúc 20h hoặc sát giờ học, nên sau khi
 * cài bot xong thì không có cách nào nhìn thấy nó hoạt động mà không phải
 * ngồi đợi. Cố ý KHÔNG ghi mã chống trùng: đây là thao tác người dùng tự bấm,
 * bấm mấy lần cũng phải gửi mấy lần, và nó chỉ gửi cho đúng người đang bấm.
 */
export async function sendTomorrowPreview(
  userId: number
): Promise<{ sent: boolean; count: number }> {
  const tomorrowISO = toISODate(addDays(now(), 1));
  const sessions = listSessionsOn(tomorrowISO);
  const label = dayLabel(tomorrowISO);

  const body =
    sessions.length === 0
      ? `📅 <b>Lịch cả trung tâm ngày mai — ${label}</b>\n\nNgày mai chưa có buổi nào.`
      : `📅 <b>Lịch cả trung tâm ngày mai — ${label}</b>\n` +
        sessions
          .map(
            (s) =>
              `• ${timeRange(s)} · ${escapeHtml(s.cls.subject)} — ${studentLabel(s)} ` +
              `(${s.cls.teacher_name ? escapeHtml(s.cls.teacher_name) : "chưa xếp giáo viên"})` +
              `${s.moved ? " (học bù)" : ""}`
          )
          .join("\n") +
        `\n\nTổng ${sessions.length} buổi. Tối nay mỗi giáo viên và học viên nhận phần lịch của riêng họ.`;

  return { sent: await sendToUser(userId, body), count: sessions.length };
}
