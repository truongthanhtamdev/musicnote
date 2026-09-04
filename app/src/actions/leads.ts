"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { todayISO } from "@/lib/format";
import { addLeadNote, findLeadsByPhone } from "@/lib/queries";
import {
  LEAD_STATUS_LABELS,
  normalizePhone,
  parseLearningMode,
  type LeadNoteKind,
  type LeadRow,
  type LeadStatus,
  type LeadTemperature,
} from "@/lib/types";
import type { FormState } from "./teachers";

/** `duplicate` mang thông báo trùng SĐT — form sẽ hỏi lại trước khi lưu đè. */
export interface LeadFormState extends FormState {
  duplicate?: string;
  leadId?: number;
}

function parseStatus(raw: string): LeadStatus {
  return raw in LEAD_STATUS_LABELS ? (raw as LeadStatus) : "new";
}

function parseTemperature(raw: string): LeadTemperature {
  return raw === "hot" || raw === "cold" ? raw : "warm";
}

function readLeadForm(formData: FormData) {
  const phone = String(formData.get("phone") || "").trim();
  return {
    name: String(formData.get("name") || "").trim(),
    phone,
    phoneNormalized: normalizePhone(phone),
    fbName: String(formData.get("fb_name") || "").trim(),
    fbUrl: String(formData.get("fb_url") || "").trim(),
    area: String(formData.get("area") || "").trim(),
    subject: String(formData.get("subject") || "").trim() || "Guitar",
    learningMode: parseLearningMode(String(formData.get("learning_mode") || "")),
    need: String(formData.get("need") || "").trim(),
    source: String(formData.get("source") || "").trim() || "Facebook Ads",
    receivedAt: String(formData.get("received_at") || "").trim() || todayISO(),
    status: parseStatus(String(formData.get("status") || "new")),
    temperature: parseTemperature(String(formData.get("temperature") || "warm")),
    ownerId: formData.get("owner_id") ? Number(formData.get("owner_id")) : null,
    nextFollowUp: String(formData.get("next_follow_up") || "").trim(),
    expectedValue: formData.get("expected_value")
      ? Number(String(formData.get("expected_value")).replace(/[^\d]/g, ""))
      : null,
    lostReason: String(formData.get("lost_reason") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
  };
}

function revalidateLead(leadId?: number) {
  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/report");
  revalidatePath("/admin");
  if (leadId) revalidatePath(`/admin/leads/${leadId}`);
}

export async function createLeadAction(
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const session = await assertRole(["admin", "coordinator"]);
  const f = readLeadForm(formData);

  if (!f.name) {
    return { error: "Vui lòng nhập tên khách hàng" };
  }
  if (!f.phone && !f.fbUrl && !f.fbName) {
    return { error: "Cần ít nhất một cách liên hệ: SĐT Zalo hoặc Facebook" };
  }

  // Cùng một người thường nhắn nhiều lần qua nhiều bài quảng cáo. Chặn lưu
  // trùng theo SĐT đã chuẩn hoá, trừ khi người nhập xác nhận đây là người khác.
  if (f.phoneNormalized && String(formData.get("force")) !== "1") {
    const dupes = findLeadsByPhone(f.phoneNormalized);
    if (dupes.length > 0) {
      const d = dupes[0];
      return {
        duplicate: `SĐT này đã có trong danh sách: "${d.name}" (${
          LEAD_STATUS_LABELS[d.status]
        }, nhận ngày ${d.received_at}). Mở lead cũ để cập nhật, hoặc bấm "Vẫn lưu" nếu là người khác.`,
        leadId: d.id,
      };
    }
  }

  const info = db
    .prepare(
      `INSERT INTO leads (name, phone, phone_normalized, fb_name, fb_url, area, subject,
        learning_mode, need, source, received_at, status, temperature, owner_id,
        next_follow_up, expected_value, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      f.name,
      f.phone || null,
      f.phoneNormalized || null,
      f.fbName || null,
      f.fbUrl || null,
      f.area || null,
      f.subject,
      f.learningMode,
      f.need || null,
      f.source,
      f.receivedAt,
      f.status,
      f.temperature,
      f.ownerId ?? session.userId,
      f.nextFollowUp || null,
      f.expectedValue || null,
      f.notes || null
    );

  revalidateLead();
  return { success: true, leadId: Number(info.lastInsertRowid) };
}

export async function updateLeadAction(
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const session = await assertRole(["admin", "coordinator"]);
  const id = Number(formData.get("id"));
  const f = readLeadForm(formData);

  if (!id || !f.name) {
    return { error: "Vui lòng nhập tên khách hàng" };
  }

  const before = db.prepare("SELECT status FROM leads WHERE id = ?").get(id) as
    | { status: LeadStatus }
    | undefined;
  if (!before) return { error: "Không tìm thấy khách hàng này" };

  db.prepare(
    `UPDATE leads SET name=?, phone=?, phone_normalized=?, fb_name=?, fb_url=?, area=?,
       subject=?, learning_mode=?, need=?, source=?, received_at=?, status=?, temperature=?,
       owner_id=?, next_follow_up=?, expected_value=?, lost_reason=?, notes=?
     WHERE id = ?`
  ).run(
    f.name,
    f.phone || null,
    f.phoneNormalized || null,
    f.fbName || null,
    f.fbUrl || null,
    f.area || null,
    f.subject,
    f.learningMode,
    f.need || null,
    f.source,
    f.receivedAt,
    f.status,
    f.temperature,
    f.ownerId,
    f.nextFollowUp || null,
    f.expectedValue || null,
    f.lostReason || null,
    f.notes || null,
    id
  );

  if (before.status !== f.status) {
    addLeadNote(
      id,
      session.userId,
      "status",
      `${LEAD_STATUS_LABELS[before.status]} → ${LEAD_STATUS_LABELS[f.status]}`
    );
  }

  revalidateLead(id);
  return { success: true };
}

export async function setLeadStatusAction(
  leadId: number,
  status: LeadStatus,
  lostReason?: string
) {
  const session = await assertRole(["admin", "coordinator"]);
  const before = db.prepare("SELECT status FROM leads WHERE id = ?").get(leadId) as
    | { status: LeadStatus }
    | undefined;
  if (!before || before.status === status) return;

  db.prepare("UPDATE leads SET status = ?, lost_reason = ? WHERE id = ?").run(
    status,
    lostReason || null,
    leadId
  );
  addLeadNote(
    leadId,
    session.userId,
    "status",
    `${LEAD_STATUS_LABELS[before.status]} → ${LEAD_STATUS_LABELS[status]}${
      lostReason ? ` (${lostReason})` : ""
    }`
  );
  revalidateLead(leadId);
}

export async function addLeadNoteAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(["admin", "coordinator"]);
  const leadId = Number(formData.get("lead_id"));
  const kindRaw = String(formData.get("kind") || "note");
  const kind: LeadNoteKind =
    kindRaw === "call" || kindRaw === "message" || kindRaw === "appointment" ? kindRaw : "note";
  const body = String(formData.get("body") || "").trim();
  const nextFollowUp = String(formData.get("next_follow_up") || "").trim();

  if (!leadId || !body) return { error: "Vui lòng nhập nội dung trao đổi" };

  addLeadNote(leadId, session.userId, kind, body);
  if (nextFollowUp) {
    db.prepare("UPDATE leads SET next_follow_up = ? WHERE id = ?").run(nextFollowUp, leadId);
  }

  revalidateLead(leadId);
  return { success: true };
}

export async function setFollowUpAction(leadId: number, date: string | null) {
  await assertRole(["admin", "coordinator"]);
  db.prepare("UPDATE leads SET next_follow_up = ? WHERE id = ?").run(date || null, leadId);
  revalidateLead(leadId);
}

/**
 * Chốt lead: tạo lớp học thật từ thông tin đã tư vấn, gắn lớp đó vào lead để
 * doanh thu của lớp quy được về đúng nguồn quảng cáo đã mang khách tới.
 */
export async function convertLeadToClassAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(["admin", "coordinator"]);
  const leadId = Number(formData.get("lead_id"));
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(leadId) as LeadRow | undefined;
  if (!lead) return { error: "Không tìm thấy khách hàng này" };
  if (lead.class_id) return { error: "Khách hàng này đã được tạo lớp rồi" };

  const studentName = String(formData.get("student_name") || "").trim() || lead.name;
  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = String(formData.get("start_time") || "");
  const durationMinutes = Number(formData.get("duration_minutes") || 60);
  const level = String(formData.get("level") || "").trim();
  const guardianName = String(formData.get("guardian_name") || "").trim();
  const teacherIdRaw = String(formData.get("teacher_id") || "");
  const packageRaw = String(formData.get("package_total_sessions") || "");

  if (Number.isNaN(dayOfWeek) || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    return { error: "Vui lòng chọn thứ và giờ học hợp lệ" };
  }

  let packageId: number | null = null;
  if (packageRaw) {
    const info = db
      .prepare("INSERT INTO packages (total_sessions, started_at) VALUES (?, ?)")
      .run(Number(packageRaw), todayISO());
    packageId = Number(info.lastInsertRowid);
  }

  const noteParts = [
    `Từ lead #${lead.id} (${lead.source})`,
    lead.area ? `Khu vực: ${lead.area}` : "",
    lead.need ? `Nhu cầu: ${lead.need}` : "",
  ].filter(Boolean);

  const info = db
    .prepare(
      `INSERT INTO classes (student_name, student_phone, guardian_name, level, subject, language,
         source, package_id, day_of_week, start_time, duration_minutes, teacher_id, notes, status)
       VALUES (?, ?, ?, ?, ?, 'vi', 'center', ?, ?, ?, ?, ?, ?, 'active')`
    )
    .run(
      studentName,
      lead.phone,
      guardianName || null,
      level || null,
      lead.subject,
      packageId,
      dayOfWeek,
      startTime,
      durationMinutes || 60,
      teacherIdRaw ? Number(teacherIdRaw) : null,
      noteParts.join(" · ")
    );

  const classId = Number(info.lastInsertRowid);
  db.prepare(
    "UPDATE leads SET class_id = ?, status = 'won', won_at = ?, next_follow_up = NULL WHERE id = ?"
  ).run(classId, todayISO(), leadId);
  addLeadNote(leadId, session.userId, "status", `Đã chốt — tạo lớp #${classId} cho ${studentName}`);

  revalidateLead(leadId);
  revalidatePath("/admin/classes");
  revalidatePath("/admin/assign");
  return { success: true };
}

/** Ghi nhận tiền học của khách đến từ lead — cùng bảng thanh toán với trang Doanh thu. */
export async function recordLeadPaymentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertRole(["admin"]);
  const leadId = Number(formData.get("lead_id"));
  const classId = Number(formData.get("class_id"));
  const amount = Number(String(formData.get("amount") || "").replace(/[^\d]/g, ""));
  const paidAt = String(formData.get("paid_at") || "");
  const note = String(formData.get("note") || "").trim();

  if (!classId) return { error: "Khách hàng chưa được tạo lớp, chưa ghi nhận thanh toán được" };
  if (!amount || amount <= 0 || !paidAt) {
    return { error: "Vui lòng nhập số tiền và ngày thu hợp lệ" };
  }

  db.prepare("INSERT INTO payments (class_id, amount, paid_at, note) VALUES (?, ?, ?, ?)").run(
    classId,
    amount,
    paidAt,
    note || null
  );

  revalidateLead(leadId);
  revalidatePath("/admin/finance");
  return { success: true };
}

export async function deleteLeadAction(leadId: number) {
  await assertRole(["admin"]);
  db.prepare("DELETE FROM leads WHERE id = ?").run(leadId);
  revalidateLead();
}
