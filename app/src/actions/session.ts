"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { addDays, now, toISODate } from "@/lib/format";
import { notifyUser } from "@/lib/queries";
import {
  CANCEL_NOTICE_HOURS,
  DAY_LABELS,
  REMINDER_DAYS,
  isNoticeInTime,
  type ClassRow,
} from "@/lib/types";
import type { FormState } from "./teachers";

/** Mọi trang có thể đổi theo một buổi học của học viên. */
function revalidateSessionViews(classId: number) {
  revalidatePath("/student");
  revalidatePath("/teacher");
  revalidatePath("/teacher/schedule");
  revalidatePath("/teacher/attendance");
  revalidatePath("/admin");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin/reschedule");
}

/**
 * Tìm lớp của chính học viên đang đăng nhập và kiểm buổi `sessionDate` có thật
 * là buổi sắp tới của lớp đó không. Dùng chung cho cả xác nhận lẫn xin nghỉ vì
 * hai bên cùng một tập điều kiện.
 */
function loadOwnUpcomingSession(
  studentUserId: number,
  classId: number,
  sessionDate: string
): { cls: ClassRow } | { error: string } {
  const cls = db
    .prepare("SELECT * FROM classes WHERE id = ? AND student_user_id = ?")
    .get(classId, studentUserId) as ClassRow | undefined;
  if (!cls) return { error: "Không tìm thấy lớp này trong tài khoản của bạn" };
  if (cls.status !== "active") return { error: "Lớp này không còn đang học" };

  const today = now();
  const todayStr = toISODate(today);
  const lastStr = toISODate(addDays(today, REMINDER_DAYS - 1));
  if (sessionDate < todayStr || sessionDate > lastStr) {
    return { error: "Chỉ thao tác được với những buổi trong tuần tới" };
  }
  return { cls };
}

/**
 * Học viên báo trước là sẽ tham gia buổi này. Không phải điểm danh — điểm danh
 * vẫn do giáo viên ghi sau buổi học như cũ; đây chỉ là để giáo viên yên tâm
 * chuẩn bị bài và biết ai chắc chắn đến.
 */
export async function confirmSessionAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(["student"]);
  const classId = Number(formData.get("class_id"));
  const sessionDate = String(formData.get("session_date") || "").trim();
  if (!classId || !sessionDate) return { error: "Dữ liệu không hợp lệ" };

  const found = loadOwnUpcomingSession(session.userId, classId, sessionDate);
  if ("error" in found) return found;

  const marked = db
    .prepare("SELECT id FROM attendance WHERE class_id = ? AND session_date = ?")
    .get(classId, sessionDate);
  if (marked) return { error: "Buổi này đã được ghi nhận rồi" };

  db.prepare(
    `INSERT INTO session_confirmations (class_id, session_date, confirmed_by) VALUES (?, ?, ?)
     ON CONFLICT(class_id, session_date) DO NOTHING`
  ).run(classId, sessionDate, session.userId);

  revalidateSessionViews(classId);
  return { success: true };
}

/** Bấm nhầm thì bỏ xác nhận, miễn là giáo viên chưa điểm danh. */
export async function unconfirmSessionAction(classId: number, sessionDate: string) {
  const session = await assertRole(["student"]);
  db.prepare(
    `DELETE FROM session_confirmations
     WHERE class_id = ? AND session_date = ? AND confirmed_by = ?`
  ).run(classId, sessionDate, session.userId);
  revalidateSessionViews(classId);
}

/**
 * Học viên xin nghỉ hẳn một buổi, không cần học bù — lịch cố định hàng tuần cứ
 * chạy tiếp sang tuần sau.
 *
 * Ghi thẳng vào hệ thống điểm danh cũ: buổi đó thành "HS vắng" kèm ghi chú, nên
 * giáo viên, giáo vụ và lịch sử điểm danh đều thấy ngay mà không cần bảng riêng.
 * Báo trước ít nhất CANCEL_NOTICE_HOURS tiếng thì không trừ tiết; sát giờ hơn
 * vẫn trừ, vì giáo viên đã giữ khung đó và không nhận lớp khác được nữa.
 */
export async function requestOffAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(["student"]);
  const classId = Number(formData.get("class_id"));
  const sessionDate = String(formData.get("session_date") || "").trim();
  const reason = String(formData.get("reason") || "").trim().slice(0, 300);
  if (!classId || !sessionDate) return { error: "Dữ liệu không hợp lệ" };

  const found = loadOwnUpcomingSession(session.userId, classId, sessionDate);
  if ("error" in found) return found;
  const { cls } = found;
  if (!cls.teacher_id) return { error: "Lớp chưa có giáo viên phụ trách" };

  const marked = db
    .prepare("SELECT id FROM attendance WHERE class_id = ? AND session_date = ?")
    .get(classId, sessionDate) as { id: number } | undefined;
  if (marked) return { error: "Buổi này đã được ghi nhận rồi, vui lòng liên hệ trung tâm" };

  const inTime = isNoticeInTime(sessionDate, cls.start_time, now());
  const countsAsUsed = inTime ? 0 : 1;
  const note = `Học viên xin nghỉ qua hệ thống${
    inTime ? "" : ` (báo sát giờ, dưới ${CANCEL_NOTICE_HOURS} tiếng)`
  }${reason ? ` — ${reason}` : ""}`;

  const apply = db.transaction(() => {
    // Xin nghỉ thì thôi xác nhận tham gia, tránh hai trạng thái ngược nhau.
    db.prepare("DELETE FROM session_confirmations WHERE class_id = ? AND session_date = ?").run(
      classId,
      sessionDate
    );
    // Đơn xin dời buổi này (nếu có) cũng không còn ý nghĩa.
    db.prepare(
      "UPDATE reschedule_requests SET status = 'cancelled' WHERE class_id = ? AND session_date = ? AND status = 'pending'"
    ).run(classId, sessionDate);
    db.prepare(
      `INSERT INTO attendance (class_id, teacher_id, session_date, status, note, counts_as_used)
       VALUES (?, ?, ?, 'student_absent', ?, ?)`
    ).run(classId, cls.teacher_id, sessionDate, note, countsAsUsed);
  });
  apply();

  const day = DAY_LABELS[new Date(`${sessionDate}T00:00:00`).getDay()];
  notifyUser(
    cls.teacher_id,
    `${cls.student_name} xin nghỉ buổi ${day} ${sessionDate} ${cls.start_time}${
      reason ? ` — ${reason}` : ""
    }`,
    cls.id
  );

  revalidateSessionViews(classId);
  return { success: true };
}
