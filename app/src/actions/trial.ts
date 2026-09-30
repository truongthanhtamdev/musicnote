"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { getUserById, getUserByEmail } from "@/lib/auth";
import { createStudentAccount } from "@/lib/student-accounts";
import { normalizeLoginPhone } from "@/lib/queries";
import { SUBJECT_SUGGESTIONS, type TrialRequestStatus, ADMIN_AREA_ROLES, canonicalSubject, DAY_LABELS } from "@/lib/types";
import { DEFAULT_TRIAL_SESSIONS, readPrize, signRequest, WHEEL_COOKIE, WHEEL_REQUEST_COOKIE, wheelCookieOptions } from "@/lib/wheel";
import type { FormState } from "./teachers";

export interface TrialFormState extends FormState {
  /** Tài khoản vừa tạo cho khách — chỉ trả về đúng lần gửi này. */
  account?: { login: string; password: string };
  /** Số này đã có tài khoản: nhắc khách đăng nhập, không lộ gì thêm. */
  accountExists?: boolean;
  /** Số buổi học thử khách được nhận, để báo lại ngay sau khi gửi. */
  trialSessions?: number;
  /** Vòng quay vừa mở khoá cho đăng ký này (false khi đã có thưởng từ lượt quay kiểu cũ). */
  wheelOpen?: boolean;
}

/** Giới hạn độ dài từng ô. Form này ai vào trang chủ cũng gửi được nên phải tự cắt, không tin dữ liệu gửi lên. */
const MAX = { name: 100, phone: 30, contact: 200, note: 500 };

function clean(formData: FormData, field: string, max: number): string {
  return String(formData.get(field) || "").trim().slice(0, max);
}

/**
 * Khách để lại thông tin xin học thử ở trang chủ. Không cần đăng nhập — đây
 * là điểm duy nhất trong hệ thống người lạ ghi được dữ liệu, nên chỉ nhận
 * đúng mấy ô cần thiết, cắt độ dài và ép bộ môn về danh sách có sẵn.
 */
export async function submitTrialRequestAction(
  _prev: TrialFormState,
  formData: FormData
): Promise<TrialFormState> {
  const name = clean(formData, "name", MAX.name);
  const phone = clean(formData, "phone", MAX.phone);
  const contact = clean(formData, "contact", MAX.contact);
  const note = clean(formData, "note", MAX.note);
  const subjectRaw = String(formData.get("subject") || "");
  const subject = SUBJECT_SUGGESTIONS.includes(subjectRaw) ? subjectRaw : SUBJECT_SUGGESTIONS[0];
  const language = String(formData.get("language") || "vi") === "en" ? "en" : "vi";

  if (!name || !phone) {
    return { error: "Vui lòng nhập họ tên và số điện thoại" };
  }
  if (!/[0-9]{8,}/.test(phone.replace(/[\s.+()-]/g, ""))) {
    return { error: "Số điện thoại chưa hợp lệ" };
  }

  // Khách quay theo luật cũ (quay trước, gửi form sau) vẫn giữ được thưởng:
  // kết quả đó nằm trong cookie do máy chủ ký, ghi luôn vào đăng ký này.
  const store = await cookies();
  const oldPrize = readPrize(store.get(WHEEL_COOKIE)?.value)?.sessions ?? null;
  const trialSessions = oldPrize ?? DEFAULT_TRIAL_SESSIONS;

  const requestId = Number(
    db
      .prepare(
        "INSERT INTO trial_requests (name, phone, contact, subject, language, note, trial_sessions, wheel_prize) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(name, phone, contact || null, subject, language, note || null, trialSessions, oldPrize).lastInsertRowid
  );
  if (oldPrize) store.delete(WHEEL_COOKIE);
  // Mở khoá vòng quay cho đúng đăng ký vừa gửi.
  store.set(WHEEL_REQUEST_COOKIE, signRequest(requestId), wheelCookieOptions);

  revalidatePath("/admin/trial-requests");
  revalidatePath("/admin");

  // Tạo luôn tài khoản cho khách: đăng ký xong là xem được lịch, khỏi chờ
  // giáo vụ. Chỉ cần tên và số điện thoại — mấy ô còn lại khách tự bổ sung
  // trong trang hồ sơ sau khi đăng nhập.
  const login = normalizeLoginPhone(phone);
  if (!login) return { success: true, trialSessions, wheelOpen: !oldPrize };

  // Số đã có tài khoản thì KHÔNG tạo và KHÔNG sinh mật khẩu mới: form này ai
  // trên mạng cũng gửi được, làm thế là người lạ gõ số của khách rồi chiếm
  // luôn tài khoản của họ.
  if (getUserByEmail(login)) return { success: true, accountExists: true, trialSessions, wheelOpen: !oldPrize };

  try {
    const account = createStudentAccount({ name, login, classIds: [] });
    db.prepare("UPDATE users SET phone = ?, note = ? WHERE id = ?").run(
      phone,
      contact || null,
      account.userId
    );
    revalidatePath("/admin/students");
    return {
      success: true,
      trialSessions,
      wheelOpen: !oldPrize,
      account: { login: account.login, password: account.password },
    };
  } catch (e) {
    // Đăng ký đã ghi nhận rồi, tài khoản hỏng thì thôi — giáo vụ tạo tay sau.
    console.error("[dang-ky-hoc-thu-tao-tk]", e);
    return { success: true, trialSessions, wheelOpen: !oldPrize };
  }
}

export async function setTrialRequestStatusAction(id: number, status: TrialRequestStatus) {
  await assertRole(ADMIN_AREA_ROLES);
  db.prepare("UPDATE trial_requests SET status = ? WHERE id = ?").run(status, id);
  revalidatePath("/admin/trial-requests");
  revalidatePath("/admin");
}

export async function deleteTrialRequestAction(id: number) {
  await assertRole(ADMIN_AREA_ROLES);
  db.prepare("DELETE FROM trial_requests WHERE id = ?").run(id);
  revalidatePath("/admin/trial-requests");
  revalidatePath("/admin");
}

/**
 * Học viên đang học đăng ký học thử thêm một môn khác ngay trong trang của
 * mình (bé đang học Guitar, mẹ muốn cho học thêm Toán).
 *
 * Không hỏi lại tên/số điện thoại: tài khoản đã có sẵn, bắt khách gõ lại chỉ
 * làm khách bỏ giữa chừng. Yêu cầu rơi vào cùng danh sách "Đăng ký học thử"
 * của giáo vụ như khách mới, nhưng ghi rõ là học viên đang học để giáo vụ gọi
 * đúng ngữ cảnh.
 */
export async function requestExtraTrialAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(["student"]);
  const user = getUserById(session.userId);
  if (!user) return { error: "Không tìm thấy tài khoản" };

  const subjectRaw = String(formData.get("subject") || "");
  if (!SUBJECT_SUGGESTIONS.includes(subjectRaw)) {
    return { error: "Bạn chọn môn muốn học thử giúp mình nhé" };
  }
  const note = clean(formData, "note", MAX.note);

  // Bấm hai lần hay gửi lại hôm sau thì vẫn là một nguyện vọng — thêm dòng
  // trùng chỉ làm giáo vụ gọi cho khách hai lần.
  const pending = db
    .prepare(
      `SELECT id FROM trial_requests
        WHERE contact = ? AND subject = ? AND status IN ('new','contacted')`
    )
    .get(user.email, subjectRaw) as { id: number } | undefined;
  if (pending) {
    return { error: `Trung tâm đã nhận đăng ký học thử môn ${subjectRaw} của bạn rồi nhé.` };
  }

  db.prepare(
    "INSERT INTO trial_requests (name, phone, contact, subject, language, note) VALUES (?, ?, ?, ?, 'vi', ?)"
  ).run(
    user.name,
    user.phone || user.email,
    user.email,
    subjectRaw,
    `Học viên đang học, đăng ký thêm môn${note ? ` — ${note}` : ""}`.slice(0, MAX.note)
  );

  revalidatePath("/admin/trial-requests");
  revalidatePath("/admin");
  revalidatePath("/student");
  return { success: true };
}

export interface BookTrialState {
  error?: string;
  success?: boolean;
}

/**
 * Nhân viên đặt hẹn chốt lịch học thử cho một đăng ký.
 *
 * Việc của họ dừng ở đúng chỗ này: hẹn khách ngày giờ nào. Còn chọn giáo viên
 * là việc của Quản lý — buổi hẹn tạo ra một lớp CHƯA có giáo viên, nằm sẵn
 * trong trang Giao lớp chờ Quản lý giao. Nhờ vậy nhân viên đặt hẹn không cần
 * (và không được) nhìn thấy danh sách lớp đang học.
 *
 * Người bấm được ghi làm người phụ trách lớp, nên khi buổi học thử diễn ra
 * thưởng học thử tự ghi đúng cho họ — không phải nhờ ai chọn hộ.
 */
export async function bookTrialAction(
  _prev: BookTrialState,
  formData: FormData
): Promise<BookTrialState> {
  const session = await assertRole(ADMIN_AREA_ROLES);

  const requestId = Number(formData.get("trial_request_id") || 0);
  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = String(formData.get("start_time") || "");
  const subject = canonicalSubject(String(formData.get("subject") || ""));
  const note = String(formData.get("note") || "").trim().slice(0, 500);

  if (!requestId) return { error: "Thiếu đăng ký học thử" };
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !/^\d{2}:\d{2}$/.test(startTime)) {
    return { error: "Chọn thứ và giờ học thử" };
  }

  const req = db.prepare("SELECT * FROM trial_requests WHERE id = ?").get(requestId) as
    | (import("@/lib/types").TrialRequestRow & { contact: string | null; note: string | null })
    | undefined;
  if (!req) return { error: "Không tìm thấy đăng ký này" };
  // Chặn đặt hẹn hai lần: bấm đúp hay hai người cùng xử lý một khách là ra
  // hai lớp học thử trùng nhau trong trang Giao lớp.
  if (req.status === "done") return { error: "Khách này đã được đặt hẹn rồi" };

  // Khách đăng ký ở trang chủ đã có sẵn tài khoản theo số điện thoại — nối
  // luôn để khách thấy buổi hẹn trong trang của mình và nhận nhắc lịch.
  const login = normalizeLoginPhone(req.phone);
  const studentUser = login
    ? (db.prepare("SELECT id FROM users WHERE email = ? AND role = 'student'").get(login) as
        | { id: number }
        | undefined)
    : undefined;

  const noteParts = [
    req.trial_sessions > 1 ? `🎁 Trúng ${req.trial_sessions} buổi học thử` : null,
    note || null,
    req.note ? `Khách ghi: ${req.note}` : null,
    req.contact ? `Liên hệ: ${req.contact}` : null,
    `Đặt hẹn bởi ${session.name}`,
  ].filter(Boolean);

  db.transaction(() => {
    db.prepare(
      `INSERT INTO classes (student_name, student_phone, student_user_id, subject, language, source,
         schedule_type, day_of_week, start_time, duration_minutes, teacher_id, notes, coordinator_id,
         status, stage, trial_pending)
       VALUES (?, ?, ?, ?, ?, 'center', 'fixed', ?, ?, 60, NULL, ?, ?, 'active', 'trial', 1)`
    ).run(
      req.name,
      req.phone,
      studentUser?.id ?? null,
      subject || req.subject,
      req.language,
      dayOfWeek,
      startTime,
      noteParts.join(" · "),
      session.userId
    );
    db.prepare("UPDATE trial_requests SET status = 'done' WHERE id = ?").run(requestId);
  })();

  logAudit(
    session,
    "lop_hoc",
    `Đặt hẹn học thử ${req.name}: ${DAY_LABELS[dayOfWeek]} ${startTime}, ${subject || req.subject}`
  );
  revalidatePath("/admin/trial-requests");
  revalidatePath("/admin/assign");
  revalidatePath("/admin");
  return { success: true };
}
