"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { getUserById, getUserByEmail } from "@/lib/auth";
import { createStudentAccount } from "@/lib/student-accounts";
import { normalizeLoginPhone } from "@/lib/queries";
import { SUBJECT_SUGGESTIONS, type TrialRequestStatus, ADMIN_AREA_ROLES } from "@/lib/types";
import { DEFAULT_TRIAL_SESSIONS, readPrize, WHEEL_COOKIE } from "@/lib/wheel";
import type { FormState } from "./teachers";

export interface TrialFormState extends FormState {
  /** Tài khoản vừa tạo cho khách — chỉ trả về đúng lần gửi này. */
  account?: { login: string; password: string };
  /** Số này đã có tài khoản: nhắc khách đăng nhập, không lộ gì thêm. */
  accountExists?: boolean;
  /** Số buổi học thử khách được nhận, để báo lại ngay sau khi gửi. */
  trialSessions?: number;
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

  // Phần thưởng lấy từ cookie do máy chủ ký, không lấy từ ô nào trong form —
  // ô nào trong form thì khách cũng sửa được trước khi bấm gửi.
  const store = await cookies();
  const trialSessions = readPrize(store.get(WHEEL_COOKIE)?.value)?.sessions ?? DEFAULT_TRIAL_SESSIONS;

  db.prepare(
    "INSERT INTO trial_requests (name, phone, contact, subject, language, note, trial_sessions) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(name, phone, contact || null, subject, language, note || null, trialSessions);

  revalidatePath("/admin/trial-requests");
  revalidatePath("/admin");

  // Tạo luôn tài khoản cho khách: đăng ký xong là xem được lịch, khỏi chờ
  // giáo vụ. Chỉ cần tên và số điện thoại — mấy ô còn lại khách tự bổ sung
  // trong trang hồ sơ sau khi đăng nhập.
  const login = normalizeLoginPhone(phone);
  if (!login) return { success: true, trialSessions };

  // Số đã có tài khoản thì KHÔNG tạo và KHÔNG sinh mật khẩu mới: form này ai
  // trên mạng cũng gửi được, làm thế là người lạ gõ số của khách rồi chiếm
  // luôn tài khoản của họ.
  if (getUserByEmail(login)) return { success: true, accountExists: true, trialSessions };

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
      account: { login: account.login, password: account.password },
    };
  } catch (e) {
    // Đăng ký đã ghi nhận rồi, tài khoản hỏng thì thôi — giáo vụ tạo tay sau.
    console.error("[dang-ky-hoc-thu-tao-tk]", e);
    return { success: true, trialSessions };
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
