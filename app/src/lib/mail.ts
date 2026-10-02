import nodemailer, { type Transporter } from "nodemailer";
import { db } from "./db";
import { SITE_URL } from "./seo";

/**
 * Gửi email cho khách qua SMTP (VD Gmail + mật khẩu ứng dụng).
 *
 * Khai trong .env.local:
 *   SMTP_HOST=smtp.gmail.com  SMTP_PORT=465
 *   SMTP_USER=ten@gmail.com   SMTP_PASS=<mật khẩu ứng dụng 16 ký tự>
 *   MAIL_FROM="Piano Guitar Đệm Hát <ten@gmail.com>"   (không bắt buộc)
 *
 * Chưa khai thì mọi lệnh gửi lặng lẽ bỏ qua — web vẫn chạy như cũ. Gửi mail
 * không bao giờ được làm hỏng thao tác đang lưu (đăng ký, đặt hẹn...), nên mọi
 * lỗi chỉ ghi log.
 */

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return (transporter = null);
  const port = Number(process.env.SMTP_PORT || 465);
  transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  return transporter;
}

export function mailEnabled(): boolean {
  return getTransporter() !== null;
}

const EMAIL_RE = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/;

/** Email hợp lệ đã chuẩn hoá (chữ thường), hoặc null. */
export function cleanEmail(raw: string | null | undefined): string | null {
  const v = String(raw ?? "").trim().toLowerCase().slice(0, 200);
  return EMAIL_RE.test(v) ? v : null;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Gửi một thư. `dedupKey`: thư cùng khoá chỉ gửi một lần (dùng chung bảng
 * telegram_log với tiền tố "mail|"), để khởi động lại máy chủ hay bấm hai lần
 * không thành hai thư.
 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  /** Đoạn nội dung HTML (đã escape); khung thư bọc ngoài tự thêm. */
  bodyHtml: string;
  dedupKey?: string;
}): Promise<boolean> {
  const t = getTransporter();
  const to = cleanEmail(opts.to);
  if (!t || !to) return false;

  if (opts.dedupKey) {
    const key = `mail|${opts.dedupKey}`;
    const claimed = db
      .prepare("INSERT OR IGNORE INTO telegram_log (dedup_key, chat_id) VALUES (?, ?)")
      .run(key, `mail:${to}`);
    if (claimed.changes === 0) return false;
  }

  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || `Piano Guitar Đệm Hát <${process.env.SMTP_USER}>`,
      to,
      subject: opts.subject,
      html: wrap(opts.bodyHtml),
    });
    return true;
  } catch (e) {
    console.error("[mail]", e);
    if (opts.dedupKey) db.prepare("DELETE FROM telegram_log WHERE dedup_key = ?").run(`mail|${opts.dedupKey}`);
    return false;
  }
}

/** Gửi không chờ: người bấm nút không phải đợi máy chủ mail trả lời. */
export function queueMail(opts: Parameters<typeof sendMail>[0]) {
  if (!mailEnabled()) return;
  void sendMail(opts).catch((e) => console.error("[mail]", e));
}

export function contactEmailOf(userId: number | null | undefined): string | null {
  if (!userId) return null;
  const row = db.prepare("SELECT contact_email FROM users WHERE id = ?").get(userId) as
    | { contact_email: string | null }
    | undefined;
  return cleanEmail(row?.contact_email);
}

function wrap(body: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:560px;margin:0 auto;padding:8px">
${body}
<p style="margin-top:24px;color:#6b7280;font-size:13px">Piano Guitar Đệm Hát · <a href="${SITE_URL}" style="color:#b45309">${SITE_URL.replace(/^https?:\/\//, "")}</a></p>
</div>`;
}

function button(href: string, label: string, color = "#c2410c"): string {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:10px">${escapeHtml(label)}</a></p>`;
}

/* ------------------------------------------------------------------ */
/* Mẫu thư                                                            */
/* ------------------------------------------------------------------ */

export function welcomeMail(o: {
  name: string;
  account?: { login: string; password: string } | null;
  facebookUrl: string | null;
}): { subject: string; bodyHtml: string } {
  const acc = o.account
    ? `<p><b>Tài khoản theo dõi lịch học</b><br>Đăng nhập: <b>${escapeHtml(o.account.login)}</b><br>Mật khẩu: <b>${escapeHtml(o.account.password)}</b></p>`
    : `<p>Bạn đăng nhập bằng số điện thoại đã đăng ký để xem lịch học.</p>`;
  return {
    subject: "Đã nhận đăng ký học thử — Piano Guitar Đệm Hát",
    bodyHtml: `<p>Chào ${escapeHtml(o.name)},</p>
<p>Trung tâm đã nhận đăng ký học thử của bạn và sẽ liên hệ để xếp lịch sớm nhất.</p>
<p><b>Các bước tiếp theo:</b></p>
<ol>
<li>Đăng nhập web để xem lịch học thử. <b>Link học Google Meet</b> sẽ hiện ở nút <b>“Vào lớp”</b> và được gửi qua email này trước giờ học.</li>
${o.facebookUrl ? `<li>Kết bạn Facebook với thầy Tâm để được sắp lớp và thêm vào nhóm lớp học.</li>` : ""}
</ol>
${acc}
${button(`${SITE_URL}/login`, "Đăng nhập xem lịch học")}
${o.facebookUrl ? button(o.facebookUrl, "Kết bạn Facebook thầy Tâm", "#1877f2") : ""}`,
  };
}

export function trialBookedMail(o: {
  name: string;
  subject: string;
  when: string;
  meetingUrl: string | null;
}): { subject: string; bodyHtml: string } {
  return {
    subject: `Lịch học thử ${o.subject}: ${o.when}`,
    bodyHtml: `<p>Chào ${escapeHtml(o.name)},</p>
<p>Trung tâm đã xếp buổi <b>học thử ${escapeHtml(o.subject)}</b> cho bạn vào <b>${escapeHtml(o.when)}</b>.</p>
${
  o.meetingUrl
    ? `<p>Đến giờ học, bạn bấm vào link Google Meet bên dưới:</p>${button(o.meetingUrl, "Vào lớp học (Google Meet)", "#059669")}`
    : `<p><b>Link học Google Meet</b> sẽ được gửi qua email này và hiện ở nút “Vào lớp” trong tài khoản trước giờ học.</p>`
}
${button(`${SITE_URL}/login`, "Đăng nhập xem lịch học")}`,
  };
}

export function meetingLinkMail(o: {
  name: string;
  subject: string;
  meetingUrl: string;
}): { subject: string; bodyHtml: string } {
  return {
    subject: `Link phòng học ${o.subject} — Piano Guitar Đệm Hát`,
    bodyHtml: `<p>Chào ${escapeHtml(o.name)},</p>
<p>Đây là link phòng học online (Google Meet) cho lớp <b>${escapeHtml(o.subject)}</b> của bạn. Đến giờ học bạn bấm vào là vào lớp:</p>
${button(o.meetingUrl, "Vào lớp học (Google Meet)", "#059669")}
<p style="color:#6b7280;font-size:13px">Link này dùng chung cho mọi buổi của lớp. Bạn cũng xem được trong tài khoản, nút “Vào lớp”.</p>`,
  };
}

export function lessonReminderMail(o: {
  name: string;
  subject: string;
  when: string;
  meetingUrl: string | null;
}): { subject: string; bodyHtml: string } {
  return {
    subject: `Sắp tới giờ học ${o.subject} (${o.when})`,
    bodyHtml: `<p>Chào ${escapeHtml(o.name)},</p>
<p>Buổi học <b>${escapeHtml(o.subject)}</b> của bạn bắt đầu lúc <b>${escapeHtml(o.when)}</b>.</p>
${o.meetingUrl ? button(o.meetingUrl, "Vào lớp học (Google Meet)", "#059669") : `${button(`${SITE_URL}/login`, "Xem lịch học")}`}`,
  };
}
