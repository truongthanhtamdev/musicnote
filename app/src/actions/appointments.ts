"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { addLeadNote, findAppointmentConflicts, getAppointment } from "@/lib/queries";
import { stampTime, vnNowStamp } from "@/lib/time";
import {
  APPOINTMENT_KIND_DEFAULT_DURATION,
  APPOINTMENT_KIND_LABELS,
  LEAD_STATUS_LABELS,
  type AppointmentKind,
  type AppointmentStatus,
  type LeadStatus,
} from "@/lib/types";
import type { FormState } from "./teachers";

export interface AppointmentFormState extends FormState {
  /** Cảnh báo trùng giờ — form hỏi lại trước khi lưu đè. */
  conflict?: string;
}

function parseKind(raw: string): AppointmentKind {
  return raw === "consult" || raw === "trial" || raw === "other" ? raw : "call";
}

function revalidateAll(leadId?: number | null) {
  revalidatePath("/admin/today");
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  if (leadId) revalidatePath(`/admin/leads/${leadId}`);
}

export async function createAppointmentAction(
  _prev: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const session = await assertRole(["admin", "coordinator"]);

  const leadId = formData.get("lead_id") ? Number(formData.get("lead_id")) : null;
  const kind = parseKind(String(formData.get("kind") || "call"));
  const date = String(formData.get("date") || "").trim();
  const time = String(formData.get("time") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const duration = Number(formData.get("duration_minutes") || 0) || APPOINTMENT_KIND_DEFAULT_DURATION[kind];
  const remind = Number(formData.get("remind_minutes") ?? 30);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)) {
    return { error: "Vui lòng chọn ngày và giờ hẹn hợp lệ" };
  }
  const startsAt = `${date} ${time}`;

  // Đặt hai việc trùng giờ là cách nhanh nhất để lỡ hẹn.
  if (String(formData.get("force")) !== "1") {
    const conflicts = findAppointmentConflicts(startsAt, duration);
    if (conflicts.length > 0) {
      const c = conflicts[0];
      return {
        conflict: `Giờ này đã có hẹn: ${stampTime(c.starts_at)} ${
          APPOINTMENT_KIND_LABELS[c.kind]
        } với ${c.lead_name || c.title || "khách"}. Bấm "Vẫn đặt" nếu bạn thật sự sắp xếp được.`,
      };
    }
  }

  const info = db
    .prepare(
      `INSERT INTO appointments (lead_id, kind, title, starts_at, duration_minutes, location,
         owner_id, status, remind_minutes, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)`
    )
    .run(
      leadId,
      kind,
      title || null,
      startsAt,
      duration,
      location || null,
      session.userId,
      Number.isFinite(remind) ? remind : 30,
      note || null
    );

  if (leadId) {
    addLeadNote(
      leadId,
      session.userId,
      "appointment",
      `Đặt lịch ${APPOINTMENT_KIND_LABELS[kind].toLowerCase()} lúc ${time} ngày ${date}${
        location ? ` tại ${location}` : ""
      }`
    );

    // Hẹn học thử thì đẩy luôn khách sang bước "Hẹn học thử" cho phễu khớp
    // thực tế, khỏi phải nhớ bấm thêm một nút nữa.
    const lead = db.prepare("SELECT status FROM leads WHERE id = ?").get(leadId) as
      | { status: LeadStatus }
      | undefined;
    if (kind === "trial" && lead && ["new", "contacted", "consulting"].includes(lead.status)) {
      db.prepare("UPDATE leads SET status = 'trial_scheduled' WHERE id = ?").run(leadId);
      addLeadNote(
        leadId,
        session.userId,
        "status",
        `${LEAD_STATUS_LABELS[lead.status]} → ${LEAD_STATUS_LABELS.trial_scheduled}`
      );
    }
    // Ngày hẹn liên hệ lại luôn khớp với lịch hẹn gần nhất.
    db.prepare("UPDATE leads SET next_follow_up = ? WHERE id = ?").run(date, leadId);
  }

  revalidateAll(leadId);
  return { success: true, ...(info.lastInsertRowid ? {} : {}) };
}

export async function setAppointmentStatusAction(id: number, status: AppointmentStatus) {
  const session = await assertRole(["admin", "coordinator"]);
  const appt = getAppointment(id);
  if (!appt) return;

  db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);

  if (appt.lead_id) {
    const labels: Record<AppointmentStatus, string> = {
      scheduled: "mở lại lịch hẹn",
      done: "đã gặp/gọi xong",
      no_show: "khách không đến",
      canceled: "huỷ lịch hẹn",
    };
    addLeadNote(
      appt.lead_id,
      session.userId,
      "appointment",
      `${stampTime(appt.starts_at)} ${APPOINTMENT_KIND_LABELS[appt.kind]}: ${labels[status]}`
    );
    // Khách không đến buổi học thử thì phải gọi lại, đừng để rơi khỏi tầm mắt.
    if (status === "no_show") {
      db.prepare("UPDATE leads SET next_follow_up = ? WHERE id = ?").run(
        vnNowStamp().slice(0, 10),
        appt.lead_id
      );
    }
  }

  revalidateAll(appt.lead_id);
}

export async function rescheduleAppointmentAction(
  _prev: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const session = await assertRole(["admin", "coordinator"]);
  const id = Number(formData.get("id"));
  const date = String(formData.get("date") || "").trim();
  const time = String(formData.get("time") || "").trim();

  const appt = getAppointment(id);
  if (!appt) return { error: "Không tìm thấy lịch hẹn" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)) {
    return { error: "Vui lòng chọn ngày và giờ mới hợp lệ" };
  }

  const startsAt = `${date} ${time}`;
  // Dời giờ thì phải nhắc lại từ đầu, nên xoá dấu đã nhắc.
  db.prepare(
    "UPDATE appointments SET starts_at = ?, reminded_at = NULL, status = 'scheduled' WHERE id = ?"
  ).run(startsAt, id);

  if (appt.lead_id) {
    addLeadNote(
      appt.lead_id,
      session.userId,
      "appointment",
      `Dời lịch: ${appt.starts_at} → ${startsAt}`
    );
    db.prepare("UPDATE leads SET next_follow_up = ? WHERE id = ?").run(date, appt.lead_id);
  }

  revalidateAll(appt.lead_id);
  return { success: true };
}

export async function deleteAppointmentAction(id: number) {
  await assertRole(["admin", "coordinator"]);
  const appt = getAppointment(id);
  db.prepare("DELETE FROM appointments WHERE id = ?").run(id);
  revalidateAll(appt?.lead_id ?? null);
}
