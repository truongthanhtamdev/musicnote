import { addDays, formatTimeRange, now, toISODate, toMinutesOfDay } from "./format";
import { listSessionsOn, type ScheduledSession } from "./queries";
import { escapeHtml, pruneTelegramLog, sendToUser, telegramEnabled } from "./telegram";
import { DAY_LABELS } from "./types";

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

function meetingLine(s: ScheduledSession): string {
  return s.cls.meeting_url ? `\n🔗 <a href="${escapeHtml(s.cls.meeting_url)}">Vào phòng học</a>` : "";
}

function movedNote(s: ScheduledSession): string {
  return s.moved ? "\n<i>(buổi học bù đã dời sang hôm nay)</i>" : "";
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
          `Học viên: ${studentLabel(s)}` +
          movedNote(s) +
          meetingLine(s),
        `${key}|gv${s.cls.teacher_id}`
      );
    }

    if (s.cls.student_user_id) {
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
      push(forTeacher, s.cls.teacher_id, `• ${timeRange(s)} · ${subject} — ${studentLabel(s)}${moved}`);
    }
    if (s.cls.student_user_id) {
      const teacher = s.cls.teacher_name ? ` với ${escapeHtml(s.cls.teacher_name)}` : "";
      push(forStudent, s.cls.student_user_id, `• ${timeRange(s)} · ${subject}${teacher}${moved}`);
    }
  }

  const label = dayLabel(tomorrowISO);
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
  if (!telegramEnabled()) return;
  try {
    const current = now();

    await remindBeforeLessons(current);

    if (current.getHours() >= DIGEST_HOUR) {
      await sendTomorrowDigest(toISODate(addDays(current, 1)));
      pruneTelegramLog();
    }
  } catch (e) {
    // Nhắc lịch hỏng thì ghi log rồi thôi — không được làm sập máy chủ web.
    console.error("[telegram] vòng nhắc lịch hỏng:", e);
  }
}

export function startTelegramReminders() {
  if (!telegramEnabled()) return;
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
