"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { logAudit } from "@/lib/audit";
import { accountTargetForClass, createStudentAccount } from "@/lib/student-accounts";
import { formatVND } from "@/lib/format";
import type { FormState } from "./teachers";

export interface PaymentState extends FormState {
  /** Tài khoản vừa tạo kèm lúc thu tiền — mật khẩu chỉ trả về đúng lần này. */
  account?: { name: string; login: string; password: string; classCount: number };
  /** Khách đã có tài khoản sẵn, chỉ gắn thêm lớp. */
  linkedTo?: { name: string; login: string; classCount: number };
}

/**
 * Ghi nhận một khoản học phí, và tạo luôn tài khoản đăng nhập cho khách nếu
 * giáo vụ tick ô đó.
 *
 * Gộp hai việc vào một bước vì chúng luôn đi cùng nhau ngoài đời: khách đóng
 * tiền xong là lúc giáo vụ đang nhắn tin với khách, đưa luôn tài khoản thì
 * khách dùng ngay; để lúc khác làm thì thường là quên.
 */
export async function recordPaymentAction(
  _prev: PaymentState,
  formData: FormData
): Promise<PaymentState> {
  const session = await assertRole(["admin"]);

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

  logAudit(session, "hoc_phi", `Thu học phí ${formatVND(amount)} ngày ${paidAt}${note ? ` (${note})` : ""}`);
  revalidatePath("/admin/finance");
  revalidatePath("/admin/classes");

  const result: PaymentState = { success: true };
  if (classId && formData.get("create_account")) {
    const target = accountTargetForClass(classId);
    if (target?.existing) {
      // Khách đã có tài khoản (đóng tiền khoá thứ hai chẳng hạn): gắn lớp
      // chưa có tài khoản vào đó, đừng tạo tài khoản thứ hai cùng số.
      const link = db.prepare("UPDATE classes SET student_user_id = ? WHERE id = ?");
      for (const id of target.classIds) link.run(target.existing.id, id);
      result.linkedTo = {
        name: target.existing.name,
        login: target.login,
        classCount: target.classIds.length,
      };
      logAudit(
        session,
        "tai_khoan",
        `Gắn ${target.classIds.length} lớp vào tài khoản có sẵn của ${target.existing.name}`
      );
    } else if (target) {
      try {
        const account = createStudentAccount({
          name: target.name,
          login: target.login,
          classIds: target.classIds,
        });
        result.account = {
          name: target.name,
          login: account.login,
          password: account.password,
          classCount: account.classCount,
        };
        logAudit(session, "tai_khoan", `Tạo tài khoản cho ${target.name} lúc thu học phí`);
      } catch (e) {
        // Tiền đã ghi nhận xong rồi, nên tài khoản hỏng thì báo riêng chứ
        // không nuốt mất khoản thu.
        console.error("[thu-tien-tao-tk]", e);
        result.error = "Đã ghi nhận tiền, nhưng chưa tạo được tài khoản. Bạn tạo lại ở trang Tài khoản học viên nhé.";
      }
    }
    revalidatePath("/admin/students");
  }
  return result;
}

export async function updatePaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await assertRole(["admin"]);

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

  logAudit(session, "hoc_phi", `Sửa khoản thu #${id} thành ${formatVND(amount)} ngày ${paidAt}`);
  revalidatePath("/admin/finance");
  revalidatePath("/admin/classes");
  return { success: true };
}

export async function deletePaymentAction(id: number) {
  const session = await assertRole(["admin"]);
  const row = db.prepare("SELECT amount, paid_at FROM payments WHERE id = ?").get(id) as
    | { amount: number; paid_at: string }
    | undefined;
  db.prepare("DELETE FROM payments WHERE id = ?").run(id);
  if (row) {
    logAudit(session, "hoc_phi", `Xoá khoản thu ${formatVND(row.amount)} ngày ${row.paid_at}`);
  }
  revalidatePath("/admin/finance");
  revalidatePath("/admin/classes");
}

export async function addExpenseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await assertRole(["admin"]);

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

  logAudit(session, "hoc_phi", `Thêm chi phí ${category} ${formatVND(amount)} ngày ${expenseDate}`);
  revalidatePath("/admin/finance");
  return { success: true };
}

export async function updateExpenseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await assertRole(["admin"]);

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

  logAudit(session, "hoc_phi", `Sửa khoản chi #${id} thành ${category} ${formatVND(amount)}`);
  revalidatePath("/admin/finance");
  return { success: true };
}

export async function deleteExpenseAction(id: number) {
  const session = await assertRole(["admin"]);
  const row = db.prepare("SELECT category, amount FROM expenses WHERE id = ?").get(id) as
    | { category: string; amount: number }
    | undefined;
  db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
  if (row) logAudit(session, "hoc_phi", `Xoá khoản chi ${row.category} ${formatVND(row.amount)}`);
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
  const session = await assertRole(["admin"]);

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

  const teacher = db.prepare("SELECT name FROM users WHERE id = ?").get(teacherId) as
    | { name: string }
    | undefined;
  logAudit(
    session,
    "luong",
    `${amount > 0 ? "Thưởng" : "Trừ"} ${formatVND(Math.abs(amount))} cho ${
      teacher?.name ?? `GV #${teacherId}`
    } ngày ${date}${reason ? ` (${reason})` : ""}`
  );
  revalidatePath("/admin/payroll");
  revalidatePath("/admin/finance");
  return { success: true };
}

export async function deletePayrollAdjustmentAction(id: number) {
  const session = await assertRole(["admin"]);
  const row = db
    .prepare(
      `SELECT a.amount, u.name FROM payroll_adjustments a
       LEFT JOIN users u ON u.id = a.teacher_id WHERE a.id = ?`
    )
    .get(id) as { amount: number; name: string | null } | undefined;
  db.prepare("DELETE FROM payroll_adjustments WHERE id = ?").run(id);
  if (row) {
    logAudit(
      session,
      "luong",
      `Xoá khoản ${formatVND(Math.abs(row.amount))} của ${row.name ?? "giáo viên đã xoá"}`
    );
  }
  revalidatePath("/admin/payroll");
  revalidatePath("/admin/finance");
}
