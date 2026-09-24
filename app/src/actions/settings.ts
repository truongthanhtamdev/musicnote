"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/guard";
import { MANAGE_ROLES } from "@/lib/types";
import { formatVND, normalizeFacebookUrl } from "@/lib/format";
import { CONTACT_KEYS, LATE_CHECKIN_QUOTA_KEY, setSetting } from "@/lib/queries";
import { setBonusRates } from "@/lib/bonus";
import { setLeadSources } from "@/lib/leads";
import { logAudit } from "@/lib/audit";
import type { FormState } from "./teachers";

/** Chỉ giữ chữ số để làm link zalo.me — khách hay gõ "0965 817 021" hoặc "+84...". */
function cleanZalo(raw: string): string {
  return raw.replace(/[^0-9]/g, "").slice(0, 15);
}

/**
 * Facebook + Zalo của trung tâm, hiện thành nút liên hệ ở trang chủ và trang
 * học viên. Để trong cài đặt thay vì viết cứng trong code để đổi được ngay
 * trên web, và để nút chỉ hiện khi đã khai đúng.
 */
export async function saveContactSettingsAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertRole(MANAGE_ROLES);

  const facebookRaw = String(formData.get("contact_facebook") || "").trim().slice(0, 300);
  const zaloRaw = String(formData.get("contact_zalo") || "").trim().slice(0, 30);

  const facebook = facebookRaw ? normalizeFacebookUrl(facebookRaw) : null;
  const zalo = cleanZalo(zaloRaw);
  if (zaloRaw && zalo.length < 8) {
    return { error: "Số Zalo chưa hợp lệ" };
  }

  setSetting(CONTACT_KEYS.facebook, facebook || "");
  setSetting(CONTACT_KEYS.zalo, zalo);

  revalidatePath("/");
  revalidatePath("/student");
  revalidatePath("/admin/settings");
  return { success: true };
}

/**
 * Số lần điểm danh bù được tha trong mỗi kỳ tính lương. Vượt hạn mức thì buổi
 * đó không tính công — đây là con số tiền bạc nên để chủ trung tâm tự đặt.
 */
export async function saveLateCheckinQuotaAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertRole(MANAGE_ROLES);

  const raw = String(formData.get("late_checkin_free_quota") || "").trim();
  const quota = Number(raw);
  if (!Number.isInteger(quota) || quota < 0 || quota > 99) {
    return { error: "Nhập số lần từ 0 đến 99" };
  }

  setSetting(LATE_CHECKIN_QUOTA_KEY, String(quota));

  revalidatePath("/admin/settings");
  revalidatePath("/admin/payroll");
  revalidatePath("/teacher");
  revalidatePath("/teacher/attendance");
  return { success: true };
}

/**
 * Mức thưởng giáo vụ. Sửa mức chỉ ảnh hưởng khoản ghi nhận từ lúc này về sau
 * — những khoản đã ghi giữ nguyên số tiền cũ, vì chúng đã vào sổ của kỳ trước.
 */
export async function saveBonusRatesAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(MANAGE_ROLES);

  const trial = Number(formData.get("bonus_trial_amount") || 0);
  const conversion = Number(formData.get("bonus_conversion_amount") || 0);
  if (!Number.isFinite(trial) || !Number.isFinite(conversion) || trial < 0 || conversion < 0) {
    return { error: "Mức thưởng phải là số không âm" };
  }

  setBonusRates(trial, conversion);
  logAudit(
    session,
    "luong",
    `Đổi mức thưởng giáo vụ: học thử ${formatVND(trial)}, chốt lớp ${formatVND(conversion)}`
  );
  revalidatePath("/admin/settings");
  revalidatePath("/admin/thuong");
  return { success: true };
}

/**
 * Danh sách nguồn khách, mỗi dòng một nguồn.
 *
 * Để chủ trung tâm tự khai vì mỗi nơi chạy quảng cáo một kiểu, và fanpage thì
 * mở thêm đóng bớt liên tục — viết cứng trong mã là vài tuần lại phải sửa.
 */
export async function saveLeadSourcesAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await assertRole(MANAGE_ROLES);
  const raw = String(formData.get("lead_sources") || "");
  const list = raw
    .split("\n")
    .map((s) => s.trim().slice(0, 60))
    .filter(Boolean);
  if (list.length === 0) return { error: "Cần ít nhất một nguồn" };

  setLeadSources(list);
  logAudit(session, "he_thong", `Cập nhật danh sách nguồn khách (${list.length} nguồn)`);
  revalidatePath("/admin/settings");
  revalidatePath("/admin/tiem-nang");
  return { success: true };
}
