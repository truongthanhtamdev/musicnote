"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { getUserByEmail } from "@/lib/auth";
import { parseCSV, parseDayOfWeek } from "@/lib/csv";

export interface ImportState {
  error?: string;
  summary?: string;
}

function randomPassword(): string {
  return crypto.randomBytes(6).toString("base64url");
}

/**
 * Expected columns (header row required, order fixed):
 * Ten,Email,SDT,LuongMoiBuoi,NgonNgu,MatKhau
 * NgonNgu: "vi", "en", hoặc "vi,en" (mặc định "vi" nếu để trống).
 * MatKhau may be blank — a random temporary password is generated.
 */
export async function importTeachersAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  await assertRole(["admin"]);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Vui lòng chọn file CSV" };
  }
  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length === 0) {
    return { error: "File CSV trống" };
  }
  const dataRows = /email/i.test(rows[0].join(",")) ? rows.slice(1) : rows;

  const insert = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, phone, pay_per_session, languages, active)
     VALUES (?, ?, ?, 'teacher', ?, ?, ?, 1)`
  );

  let created = 0;
  let skipped = 0;
  const generatedCreds: string[] = [];

  for (const cols of dataRows) {
    const [name, email, phone, payRaw, languagesRaw, passwordRaw] = cols.map((c) => (c || "").trim());
    if (!name || !email) {
      skipped++;
      continue;
    }
    if (getUserByEmail(email)) {
      skipped++;
      continue;
    }
    const password = passwordRaw || randomPassword();
    const payPerSession = payRaw ? Number(payRaw.replace(/[^\d]/g, "")) : null;
    const languages = languagesRaw || "vi";
    insert.run(
      name,
      email.toLowerCase(),
      bcrypt.hashSync(password, 10),
      phone || null,
      payPerSession || null,
      languages
    );
    created++;
    if (!passwordRaw) generatedCreds.push(`${email}: ${password}`);
  }

  revalidatePath("/admin/teachers");

  let summary = `Đã tạo ${created} giáo viên, bỏ qua ${skipped} dòng (thiếu dữ liệu hoặc email đã tồn tại).`;
  if (generatedCreds.length > 0) {
    summary += ` Mật khẩu tạm được sinh tự động — hãy lưu lại và gửi cho giáo viên:\n${generatedCreds.join("\n")}`;
  }
  return { summary };
}

/**
 * Expected columns (header row required, order fixed):
 * TenHocSinh,SDT,TrinhDo,MonHoc,NgonNgu,Thu,GioBatDau,ThoiLuongPhut,EmailGiaoVien,GhiChu
 * Thu accepts T2..T7/CN or 0-6. MonHoc mặc định "Guitar" nếu để trống.
 * NgonNgu là "vi" hoặc "en", mặc định "vi". EmailGiaoVien may be blank (lớp chưa xếp GV).
 */
export async function importClassesAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  await assertRole(["admin", "coordinator"]);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Vui lòng chọn file CSV" };
  }
  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length === 0) {
    return { error: "File CSV trống" };
  }
  const dataRows = /thu|gio|hocsinh|học sinh/i.test(rows[0].join(",")) ? rows.slice(1) : rows;

  const insert = db.prepare(
    `INSERT INTO classes (student_name, student_phone, level, subject, language, day_of_week, start_time, duration_minutes, teacher_id, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
  );

  let created = 0;
  const errors: string[] = [];

  dataRows.forEach((cols, idx) => {
    const [
      studentName,
      studentPhone,
      level,
      subjectRaw,
      languageRaw,
      dayRaw,
      startTime,
      durationRaw,
      teacherEmail,
      notes,
    ] = cols.map((c) => (c || "").trim());
    const lineNo = idx + 2; // account for header row

    if (!studentName) {
      errors.push(`Dòng ${lineNo}: thiếu tên học sinh`);
      return;
    }
    const dayOfWeek = parseDayOfWeek(dayRaw || "");
    if (dayOfWeek === null) {
      errors.push(`Dòng ${lineNo}: thứ học không hợp lệ ("${dayRaw}")`);
      return;
    }
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(startTime || "")) {
      errors.push(`Dòng ${lineNo}: giờ học không hợp lệ ("${startTime}"), cần dạng HH:MM`);
      return;
    }

    let teacherId: number | null = null;
    if (teacherEmail) {
      const teacher = getUserByEmail(teacherEmail);
      if (!teacher || teacher.role !== "teacher") {
        errors.push(`Dòng ${lineNo}: không tìm thấy giáo viên với email "${teacherEmail}", lớp được để trống GV`);
      } else {
        teacherId = teacher.id;
      }
    }

    const durationMinutes = durationRaw ? Number(durationRaw) : 60;
    const language = languageRaw.toLowerCase() === "en" ? "en" : "vi";
    insert.run(
      studentName,
      studentPhone || null,
      level || null,
      subjectRaw || "Guitar",
      language,
      dayOfWeek,
      startTime,
      Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 60,
      teacherId,
      notes || null
    );
    created++;
  });

  revalidatePath("/admin/classes");
  revalidatePath("/admin/assign");

  let summary = `Đã tạo ${created} lớp học.`;
  if (errors.length > 0) {
    summary += ` Có ${errors.length} dòng lỗi:\n${errors.slice(0, 30).join("\n")}`;
    if (errors.length > 30) summary += `\n... và ${errors.length - 30} lỗi khác`;
  }
  return { summary };
}
