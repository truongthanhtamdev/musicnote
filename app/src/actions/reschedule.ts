"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole, assertSession } from "@/lib/guard";
import { addDays, now, toISODate } from "@/lib/format";
import { listTeacherFreeSlots, notifyUser } from "@/lib/queries";
import { DAY_LABELS, MAKEUP_WINDOW_DAYS, REMINDER_DAYS, type ClassRow } from "@/lib/types";
import type { FormState } from "./teachers";

/** Học viên chỉ xin dời được buổi trong tầm nhắc lịch, đúng bằng những buổi đang thấy trên trang. */
const REQUEST_WINDOW_DAYS = REMINDER_DAYS;

function describe(cls: Pick<ClassRow, "subject">, date: string, time: string): string {
  const day = DAY_LABELS[new Date(`${date}T00:00:00`).getDay()];
  return `${cls.subject} ${day} ${date} ${time}`;
}

/**
 * Học viên xin dời một buổi cụ thể. Giờ đề xuất bắt buộc phải nằm trong danh
 * sách khung giáo viên đang trống — chọn trên giao diện đã lọc sẵn, và kiểm
 * lại ở đây vì dữ liệu gửi lên sửa được. Đơn vẫn phải chờ duyệt, hệ thống
 * không tự đổi lịch của giáo viên.
 */
export async function requestRescheduleAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(["student"]);

  const classId = Number(formData.get("class_id"));
  const sessionDate = String(formData.get("session_date") || "").trim();
  const slot = String(formData.get("slot") || "").trim(); // "YYYY-MM-DD HH:MM"
  const reason = String(formData.get("reason") || "").trim().slice(0, 300);

  const [toDate, toTime] = slot.split(" ");
  if (!classId || !sessionDate || !toDate || !toTime) {
    return { error: "Vui lòng chọn buổi cần dời và giờ học bù" };
  }

  const cls = db
    .prepare("SELECT * FROM classes WHERE id = ? AND student_user_id = ?")
    .get(classId, session.userId) as ClassRow | undefined;
  if (!cls) return { error: "Không tìm thấy lớp này trong tài khoản của bạn" };
  if (cls.status !== "active") return { error: "Lớp này không còn đang học" };
  if (cls.schedule_type !== "fixed") {
    return { error: "Lớp lịch linh động hẹn trực tiếp với giáo viên, không cần xin dời" };
  }
  if (!cls.teacher_id) return { error: "Lớp chưa có giáo viên phụ trách" };

  const today = now();
  const todayStr = toISODate(today);
  const lastStr = toISODate(addDays(today, REQUEST_WINDOW_DAYS - 1));
  if (sessionDate < todayStr || sessionDate > lastStr) {
    return { error: "Chỉ xin dời được những buổi trong tuần tới" };
  }
  if (new Date(`${sessionDate}T00:00:00`).getDay() !== cls.day_of_week) {
    return { error: "Ngày này không phải buổi học của lớp" };
  }

  const alreadyMarked = db
    .prepare("SELECT id FROM attendance WHERE class_id = ? AND session_date = ?")
    .get(classId, sessionDate);
  if (alreadyMarked) return { error: "Buổi này đã được điểm danh, vui lòng liên hệ trung tâm" };

  const pending = db
    .prepare(
      "SELECT id FROM reschedule_requests WHERE class_id = ? AND session_date = ? AND status = 'pending'"
    )
    .get(classId, sessionDate);
  if (pending) return { error: "Buổi này đang có một yêu cầu chờ giáo viên duyệt" };

  // Không loại lớp này ra khỏi phép kiểm: khung cố định hàng tuần của chính bé
  // vẫn là giờ đã có lịch học, dời vào đó là trùng chính mình.
  const free = listTeacherFreeSlots({
    teacherId: cls.teacher_id,
    durationMinutes: cls.duration_minutes,
    days: MAKEUP_WINDOW_DAYS,
  });
  if (!free.some((s) => s.date === toDate && s.time === toTime)) {
    return { error: "Giáo viên đã kín giờ này, vui lòng chọn giờ khác" };
  }

  db.prepare(
    `INSERT INTO reschedule_requests (class_id, requested_by, session_date, to_date, to_time, reason)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(classId, session.userId, sessionDate, toDate, toTime, reason || null);

  notifyUser(
    cls.teacher_id,
    `${cls.student_name} xin dời buổi ${sessionDate} sang ${describe(cls, toDate, toTime)}`,
    cls.id
  );

  revalidatePath("/student");
  revalidatePath("/teacher");
  revalidatePath("/teacher/schedule");
  revalidatePath("/admin/reschedule");
  return { success: true };
}

/**
 * Giáo viên (hoặc trung tâm) duyệt hay từ chối đơn. Duyệt xong buổi gốc được
 * ghi vào đúng hệ thống điểm danh cũ — trạng thái "Dời lịch" kèm ngày giờ học
 * bù đã chốt — nên phần tính tiết, tính lương không đổi gì.
 */
export async function respondRescheduleAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(["teacher", "admin", "coordinator"]);

  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("response_note") || "").trim().slice(0, 300);
  if (!id || (decision !== "approve" && decision !== "decline")) {
    return { error: "Dữ liệu không hợp lệ" };
  }

  const req = db
    .prepare(
      `SELECT r.*, c.teacher_id, c.subject, c.student_name
       FROM reschedule_requests r JOIN classes c ON c.id = r.class_id WHERE r.id = ?`
    )
    .get(id) as
    | {
        id: number;
        class_id: number;
        requested_by: number;
        session_date: string;
        to_date: string;
        to_time: string;
        status: string;
        teacher_id: number | null;
        subject: string;
        student_name: string;
      }
    | undefined;
  if (!req) return { error: "Không tìm thấy yêu cầu này" };
  if (req.status !== "pending") return { error: "Yêu cầu này đã được xử lý" };
  if (session.role === "teacher" && req.teacher_id !== session.userId) {
    return { error: "Bạn không phụ trách lớp này" };
  }

  const apply = db.transaction(() => {
    db.prepare(
      `UPDATE reschedule_requests
       SET status = ?, response_note = ?, responded_by = ?, responded_at = datetime('now')
       WHERE id = ?`
    ).run(decision === "approve" ? "approved" : "declined", note || null, session.userId, id);

    if (decision !== "approve") return;

    // Buổi gốc thành "Dời lịch" kèm ngày giờ học bù — đúng cách giáo viên vẫn
    // ghi tay lâu nay, chỉ là đơn của khách điền hộ. Buổi dời có báo trước nên
    // không tính tiết (counts_as_used = 0).
    db.prepare(
      `INSERT INTO attendance (class_id, teacher_id, session_date, status, rescheduled_to_date, rescheduled_to_time, note, counts_as_used)
       VALUES (?, ?, ?, 'rescheduled', ?, ?, ?, 0)
       ON CONFLICT(class_id, session_date) DO UPDATE SET
         status = 'rescheduled',
         rescheduled_to_date = excluded.rescheduled_to_date,
         rescheduled_to_time = excluded.rescheduled_to_time,
         counts_as_used = 0`
    ).run(
      req.class_id,
      req.teacher_id,
      req.session_date,
      req.to_date,
      req.to_time,
      "Học viên xin dời qua hệ thống"
    );
  });
  apply();

  notifyUser(
    req.requested_by,
    decision === "approve"
      ? `Đã duyệt dời buổi ${req.session_date} sang ${describe(req, req.to_date, req.to_time)}`
      : `Không dời được buổi ${req.session_date}${note ? ` — ${note}` : ""}. Vui lòng chọn giờ khác.`,
    req.class_id
  );

  revalidatePath("/student");
  revalidatePath("/teacher");
  revalidatePath("/teacher/schedule");
  revalidatePath("/teacher/attendance");
  revalidatePath("/admin/reschedule");
  revalidatePath("/admin/attendance");
  return { success: true };
}

/** Học viên rút lại đơn của chính mình khi chưa ai duyệt. */
export async function cancelRescheduleAction(id: number) {
  const session = await assertSession();
  db.prepare(
    "UPDATE reschedule_requests SET status = 'cancelled' WHERE id = ? AND requested_by = ? AND status = 'pending'"
  ).run(id, session.userId);
  revalidatePath("/student");
  revalidatePath("/teacher");
  revalidatePath("/admin/reschedule");
}
