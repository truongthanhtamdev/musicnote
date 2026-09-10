"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/guard";
import { normalizeFacebookUrl } from "@/lib/format";
import { CONTACT_KEYS, LATE_CHECKIN_QUOTA_KEY, setSetting } from "@/lib/queries";
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
  await assertRole(["admin"]);

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
  await assertRole(["admin"]);

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
