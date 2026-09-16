"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import type { FormState } from "./teachers";

function revalidateServices() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/finance");
}

export async function saveServiceAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertRole(["admin"]);

  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const name = String(formData.get("name") || "").trim();
  const ownerRaw = String(formData.get("default_owner_id") || "");
  const ownerId = ownerRaw ? Number(ownerRaw) : null;

  if (!name) return { error: "Vui lòng nhập tên mảng dịch vụ" };

  const existing = db.prepare("SELECT id FROM services WHERE name = ?").get(name) as
    | { id: number }
    | undefined;
  if (existing && existing.id !== id) {
    return { error: `Đã có mảng tên "${name}"` };
  }

  if (id) {
    db.prepare("UPDATE services SET name = ?, default_owner_id = ? WHERE id = ?").run(
      name,
      ownerId,
      id
    );
  } else {
    const max = (
      db.prepare("SELECT COALESCE(MAX(sort_order), 0) as m FROM services").get() as { m: number }
    ).m;
    db.prepare(
      "INSERT INTO services (name, default_owner_id, sort_order) VALUES (?, ?, ?)"
    ).run(name, ownerId, max + 1);
  }

  revalidateServices();
  return { success: true };
}

/** Ẩn mảng khỏi các ô chọn nhưng giữ nguyên khách cũ đã gắn vào nó. */
export async function toggleServiceActiveAction(id: number, active: boolean) {
  await assertRole(["admin"]);
  db.prepare("UPDATE services SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
  revalidateServices();
}

export async function deleteServiceAction(id: number) {
  await assertRole(["admin"]);
  db.prepare("DELETE FROM services WHERE id = ?").run(id);
  revalidateServices();
}
