"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession, ForbiddenError } from "@/lib/guard";
import { canUseClassChat, notifyUser } from "@/lib/queries";
import { MESSAGE_MAX_LENGTH, type ClassRow } from "@/lib/types";
import type { FormState } from "./teachers";

function loadClass(classId: number): ClassRow {
  const cls = db.prepare("SELECT * FROM classes WHERE id = ?").get(classId) as
    | ClassRow
    | undefined;
  if (!cls) throw new ForbiddenError("Không tìm thấy lớp này");
  return cls;
}

/**
 * Gửi một tin nhắn trong lớp. Người gửi phải là học viên của lớp, giáo viên
 * của lớp, hoặc giáo vụ — kiểm tra ở server chứ không tin vào giao diện.
 *
 * Gửi xong báo cho bên kia qua chuông thông báo có sẵn, vì không phải lúc nào
 * người ta cũng đang mở trang tin nhắn.
 */
export async function sendClassMessageAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertSession();
  const classId = Number(formData.get("class_id"));
  const body = String(formData.get("body") || "").trim();

  if (!classId || !body) return { error: "Chưa nhập nội dung tin nhắn" };
  if (body.length > MESSAGE_MAX_LENGTH) {
    return { error: `Tin nhắn tối đa ${MESSAGE_MAX_LENGTH} ký tự` };
  }

  const cls = loadClass(classId);
  if (!canUseClassChat(cls, session.userId, session.role)) throw new ForbiddenError();

  const result = db
    .prepare("INSERT INTO class_messages (class_id, sender_id, body) VALUES (?, ?, ?)")
    .run(classId, session.userId, body);

  // Người gửi coi như đã đọc tới tin của chính mình.
  db.prepare(
    `INSERT INTO class_message_reads (class_id, user_id, last_read_message_id) VALUES (?, ?, ?)
     ON CONFLICT(class_id, user_id) DO UPDATE SET last_read_message_id = excluded.last_read_message_id`
  ).run(classId, session.userId, result.lastInsertRowid);

  const preview = body.length > 60 ? `${body.slice(0, 60)}...` : body;
  const recipients = [cls.teacher_id, cls.student_user_id].filter(
    (id): id is number => !!id && id !== session.userId
  );
  for (const id of recipients) {
    notifyUser(id, `${session.name} nhắn về lớp ${cls.student_name}: ${preview}`, classId);
  }

  revalidatePath("/teacher/messages");
  revalidatePath("/student/messages");
  revalidatePath(`/admin/classes/${classId}`);
  return { success: true };
}

/** Đánh dấu đã đọc tới tin cuối cùng của lớp. */
export async function markClassMessagesReadAction(classId: number) {
  const session = await assertSession();
  const cls = loadClass(classId);
  if (!canUseClassChat(cls, session.userId, session.role)) throw new ForbiddenError();

  const last = db
    .prepare("SELECT MAX(id) as id FROM class_messages WHERE class_id = ?")
    .get(classId) as { id: number | null };
  if (!last.id) return;

  db.prepare(
    `INSERT INTO class_message_reads (class_id, user_id, last_read_message_id) VALUES (?, ?, ?)
     ON CONFLICT(class_id, user_id) DO UPDATE SET last_read_message_id = excluded.last_read_message_id`
  ).run(classId, session.userId, last.id);

  revalidatePath("/teacher/messages");
  revalidatePath("/student/messages");
}
