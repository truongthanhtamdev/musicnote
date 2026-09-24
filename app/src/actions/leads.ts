"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { ADMIN_AREA_ROLES } from "@/lib/types";
import { normalizeFacebookUrl } from "@/lib/format";
import { createLead, deleteLead, getLead, updateLead, type LeadStage } from "@/lib/leads";
import { logAudit } from "@/lib/audit";
import type { FormState } from "./teachers";

const STAGES = ["new", "talking", "callback", "trial_booked", "won", "lost"];

function readForm(formData: FormData) {
  const stageRaw = String(formData.get("stage") || "new");
  return {
    name: String(formData.get("name") || "").trim().slice(0, 120),
    phone: String(formData.get("phone") || "").trim().slice(0, 40) || null,
    facebookUrl: normalizeFacebookUrl(String(formData.get("facebook_url") || "")) || null,
    subject: String(formData.get("subject") || "").trim().slice(0, 60) || null,
    source: String(formData.get("source") || "").trim().slice(0, 60) || null,
    stage: (STAGES.includes(stageRaw) ? stageRaw : "new") as LeadStage,
    nextFollowUp: String(formData.get("next_follow_up") || "").trim() || null,
    note: String(formData.get("note") || "").trim().slice(0, 2000) || null,
  };
}

/**
 * Thêm khách tiềm năng.
 *
 * Chỉ bắt buộc tên — giáo vụ đang ngồi trong hộp thư Facebook, nhiều khi mới
 * biết mỗi cái tên. Bắt điền đủ thì người ta sẽ không nhập, mà không nhập thì
 * khách trôi mất, tức là mất đúng thứ bảng này sinh ra để giữ.
 */
export async function createLeadAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(ADMIN_AREA_ROLES);
  const data = readForm(formData);
  if (!data.name) return { error: "Vui lòng nhập tên khách" };

  createLead({ ...data, coordinatorId: session.userId });
  logAudit(session, "lop_hoc", `Thêm khách tiềm năng ${data.name}`);
  revalidatePath("/admin/tiem-nang");
  revalidatePath("/admin");
  return { success: true };
}

export async function updateLeadAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(ADMIN_AREA_ROLES);
  const id = Number(formData.get("id"));
  const before = getLead(id);
  if (!before) return { error: "Không tìm thấy khách này" };

  const data = readForm(formData);
  if (!data.name) return { error: "Vui lòng nhập tên khách" };

  updateLead(id, data);
  logAudit(session, "lop_hoc", `Sửa khách tiềm năng ${data.name}`);
  revalidatePath("/admin/tiem-nang");
  revalidatePath("/admin");
  return { success: true };
}

/** Đổi nhanh giai đoạn ngay trên danh sách, khỏi mở hộp thoại sửa. */
export async function setLeadStageAction(id: number, stage: string) {
  const session = await assertRole(ADMIN_AREA_ROLES);
  if (!STAGES.includes(stage)) return;
  const before = getLead(id);
  if (!before) return;

  updateLead(id, { stage: stage as LeadStage });
  logAudit(session, "lop_hoc", `Khách ${before.name}: đổi giai đoạn sang ${stage}`);
  revalidatePath("/admin/tiem-nang");
  revalidatePath("/admin");
}

/**
 * Hẹn ngày liên hệ lại. Đây là thao tác dùng nhiều nhất nên tách riêng: gọi
 * xong, chọn ngày, xong việc.
 */
export async function snoozeLeadAction(id: number, date: string) {
  const session = await assertRole(ADMIN_AREA_ROLES);
  const before = getLead(id);
  if (!before) return;

  updateLead(id, {
    nextFollowUp: date || null,
    // Đặt hẹn tức là vẫn đang theo khách này; nếu trước đó mới chỉ "mới nhắn"
    // thì chuyển sang "hẹn liên hệ lại" cho đúng thực tế.
    ...(date && (before.stage === "new" || before.stage === "talking")
      ? { stage: "callback" as LeadStage }
      : {}),
  });
  logAudit(session, "lop_hoc", `Khách ${before.name}: hẹn liên hệ lại ${date || "(bỏ hẹn)"}`);
  revalidatePath("/admin/tiem-nang");
  revalidatePath("/admin");
}

export async function deleteLeadAction(id: number) {
  const session = await assertRole(ADMIN_AREA_ROLES);
  const before = getLead(id);
  if (!before) return;

  deleteLead(id);
  logAudit(session, "lop_hoc", `Xoá khách tiềm năng ${before.name}`);
  revalidatePath("/admin/tiem-nang");
  revalidatePath("/admin");
}

/**
 * Chuyển khách thành đăng ký học thử, để đi tiếp bằng đúng luồng cũ (tạo lớp,
 * xếp giáo viên). Không chép sang rồi xoá ở đây: khách vẫn nằm lại danh sách
 * với giai đoạn "Đã đặt học thử", để còn theo dõi xem có tới học thật không.
 */
export async function leadToTrialRequestAction(id: number) {
  const session = await assertRole(ADMIN_AREA_ROLES);
  const lead = getLead(id);
  if (!lead) return;

  db.prepare(
    `INSERT INTO trial_requests (name, phone, contact, subject, language, note, status)
     VALUES (?, ?, ?, ?, 'vi', ?, 'contacted')`
  ).run(
    lead.name,
    lead.phone || "",
    lead.facebook_url || null,
    lead.subject || "Guitar",
    [lead.note, lead.source ? `Nguồn: ${lead.source}` : null].filter(Boolean).join(" · ") || null
  );

  // Xoá ngày hẹn: từ đây khách đã sang trang Đăng ký học thử, việc theo dõi
  // do trang đó lo. Giữ lại thì danh sách cứ báo "quá hạn" cho một khách đã
  // xong việc, mà nhắc sai vài lần là người ta thôi tin phần nhắc.
  updateLead(id, { stage: "trial_booked", nextFollowUp: null });
  logAudit(session, "lop_hoc", `Chuyển khách ${lead.name} sang đăng ký học thử`);
  revalidatePath("/admin/tiem-nang");
  revalidatePath("/admin/trial-requests");
  revalidatePath("/admin");
}
