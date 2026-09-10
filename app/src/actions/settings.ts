"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/guard";
import { normalizeFacebookUrl } from "@/lib/format";
import { CONTACT_KEYS, setSetting } from "@/lib/queries";
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
