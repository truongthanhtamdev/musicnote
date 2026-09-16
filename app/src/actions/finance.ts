"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import type { FormState } from "./teachers";

export async function recordPaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin"]);

  const classId = formData.get("class_id") ? Number(formData.get("class_id")) : null;
  const amount = Number(formData.get("amount") || 0);
  const paidAt = String(formData.get("paid_at") || "");
  const note = String(formData.get("note") || "").trim();

  if (!amount || amount <= 0 || !paidAt) {
    return { error: "Vui lòng nhập số tiền và ngày thu hợp lệ" };
  }

  db.prepare(
    "INSERT INTO payments (class_id, amount, paid_at, note) VALUES (?, ?, ?, ?)"
  ).run(classId, amount, paidAt, note || null);

  revalidatePath("/admin/finance");
  return { success: true };
}

export async function deletePaymentAction(id: number) {
  await assertRole(["admin"]);
  db.prepare("DELETE FROM payments WHERE id = ?").run(id);
  revalidatePath("/admin/finance");
}

export async function addExpenseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin"]);

  const category = String(formData.get("category") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const expenseDate = String(formData.get("expense_date") || "");
  const note = String(formData.get("note") || "").trim();
  const serviceRaw = String(formData.get("service_id") || "");

  if (!category || !amount || amount <= 0 || !expenseDate) {
    return { error: "Vui lòng nhập đầy đủ loại chi phí, số tiền và ngày" };
  }

  // Gắn khoản chi vào mảng dịch vụ để báo cáo tính được tiền quảng cáo đã bỏ
  // ra cho từng mảng, thay vì gộp một cục.
  db.prepare(
    "INSERT INTO expenses (category, amount, expense_date, note, service_id) VALUES (?, ?, ?, ?, ?)"
  ).run(category, amount, expenseDate, note || null, serviceRaw ? Number(serviceRaw) : null);

  revalidatePath("/admin/finance");
  revalidatePath("/admin/leads/report");
  return { success: true };
}

export async function deleteExpenseAction(id: number) {
  await assertRole(["admin"]);
  db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
  revalidatePath("/admin/finance");
}
