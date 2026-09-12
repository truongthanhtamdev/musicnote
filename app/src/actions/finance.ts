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
  revalidatePath("/admin/classes");
  return { success: true };
}

export async function updatePaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin"]);

  const id = Number(formData.get("id"));
  const classId = formData.get("class_id") ? Number(formData.get("class_id")) : null;
  const amount = Number(formData.get("amount") || 0);
  const paidAt = String(formData.get("paid_at") || "");
  const note = String(formData.get("note") || "").trim();

  if (!id || !amount || amount <= 0 || !paidAt) {
    return { error: "Vui lòng nhập số tiền và ngày thu hợp lệ" };
  }

  const result = db
    .prepare("UPDATE payments SET class_id = ?, amount = ?, paid_at = ?, note = ? WHERE id = ?")
    .run(classId, amount, paidAt, note || null, id);
  if (result.changes === 0) return { error: "Không tìm thấy khoản thu" };

  revalidatePath("/admin/finance");
  revalidatePath("/admin/classes");
  return { success: true };
}

export async function deletePaymentAction(id: number) {
  await assertRole(["admin"]);
  db.prepare("DELETE FROM payments WHERE id = ?").run(id);
  revalidatePath("/admin/finance");
  revalidatePath("/admin/classes");
}

export async function addExpenseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin"]);

  const category = String(formData.get("category") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const expenseDate = String(formData.get("expense_date") || "");
  const note = String(formData.get("note") || "").trim();

  if (!category || !amount || amount <= 0 || !expenseDate) {
    return { error: "Vui lòng nhập đầy đủ loại chi phí, số tiền và ngày" };
  }

  db.prepare(
    "INSERT INTO expenses (category, amount, expense_date, note) VALUES (?, ?, ?, ?)"
  ).run(category, amount, expenseDate, note || null);

  revalidatePath("/admin/finance");
  return { success: true };
}

export async function updateExpenseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin"]);

  const id = Number(formData.get("id"));
  const category = String(formData.get("category") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const expenseDate = String(formData.get("expense_date") || "");
  const note = String(formData.get("note") || "").trim();

  if (!id || !category || !amount || amount <= 0 || !expenseDate) {
    return { error: "Vui lòng nhập đầy đủ loại chi phí, số tiền và ngày" };
  }

  const result = db
    .prepare(
      "UPDATE expenses SET category = ?, amount = ?, expense_date = ?, note = ? WHERE id = ?"
    )
    .run(category, amount, expenseDate, note || null, id);
  if (result.changes === 0) return { error: "Không tìm thấy khoản chi" };

  revalidatePath("/admin/finance");
  return { success: true };
}

export async function deleteExpenseAction(id: number) {
  await assertRole(["admin"]);
  db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
  revalidatePath("/admin/finance");
}

/**
 * Cộng thêm (hoặc trừ bớt) tiền cho một giáo viên trong kỳ lương: thưởng, tip
 * khách gửi, phụ cấp xăng xe... Ghi số âm là trừ.
 *
 * Tách riêng khỏi đơn giá/buổi vì đây là khoản một lần, không được phép làm
 * thay đổi cách tính công của những kỳ khác.
 */
export async function addPayrollAdjustmentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertRole(["admin"]);

  const teacherId = Number(formData.get("teacher_id"));
  const amount = Math.round(Number(formData.get("amount") || 0));
  const reason = String(formData.get("reason") || "").trim();
  const date = String(formData.get("adjustment_date") || "");

  if (!teacherId || !Number.isFinite(amount) || amount === 0 || !date) {
    return { error: "Nhập số tiền khác 0 và chọn ngày" };
  }

  db.prepare(
    "INSERT INTO payroll_adjustments (teacher_id, amount, reason, adjustment_date) VALUES (?, ?, ?, ?)"
  ).run(teacherId, amount, reason || null, date);

  revalidatePath("/admin/payroll");
  revalidatePath("/admin/finance");
  return { success: true };
}

export async function deletePayrollAdjustmentAction(id: number) {
  await assertRole(["admin"]);
  db.prepare("DELETE FROM payroll_adjustments WHERE id = ?").run(id);
  revalidatePath("/admin/payroll");
  revalidatePath("/admin/finance");
}
