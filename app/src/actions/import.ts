"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { getUserByEmail } from "@/lib/auth";
import { parseCSV, parseDayOfWeek } from "@/lib/csv";
import { todayISO } from "@/lib/format";
import { findLeadsByPhone } from "@/lib/queries";
import { normalizePhone, type LeadLearningMode } from "@/lib/types";

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
 * TenHocSinh,SDT,PhuHuynh,TrinhDo,MonHoc,NgonNgu,Thu,GioBatDau,ThoiLuongPhut,EmailGiaoVien,GhiChu
 * Thu accepts T2..T7/CN or 0-6. PhuHuynh (tên người đóng tiền) may be blank nếu học viên tự đóng.
 * MonHoc mặc định "Guitar" nếu để trống. NgonNgu là "vi" hoặc "en", mặc định "vi".
 * EmailGiaoVien may be blank (lớp chưa xếp GV).
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
    `INSERT INTO classes (student_name, student_phone, guardian_name, level, subject, language, day_of_week, start_time, duration_minutes, teacher_id, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
  );

  let created = 0;
  const errors: string[] = [];

  dataRows.forEach((cols, idx) => {
    const [
      studentName,
      studentPhone,
      guardianName,
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
      guardianName || null,
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

/** "1 kèm 1 tại nhà" / "online" / "cà phê" / "trung tâm" → mã hình thức học trong hệ thống. */
function parseLearningModeText(raw: string): LeadLearningMode {
  const t = (raw || "").toLowerCase();
  if (!t) return "home_private";
  if (t.includes("online") || t.includes("trực tuyến")) return "online";
  if (t.includes("cà phê") || t.includes("ca phe") || t.includes("nhóm") || t.includes("cafe"))
    return "cafe_group";
  if (t.includes("trung tâm") || t.includes("trung tam")) return "center";
  return "home_private";
}

/**
 * Nhập data khách hàng tiềm năng từ Facebook (file tải về từ Lead Ads, hoặc
 * file Excel giáo vụ tự gõ), cột theo đúng thứ tự:
 * Ten,SDT,TenFacebook,LinkFacebook,KhuVuc,MonHoc,HinhThucHoc,NhuCau,Nguon,NgayNhan,GhiChu
 * Dòng trùng SĐT (đã có trong danh sách) sẽ bị bỏ qua để tránh nhân đôi khách.
 */
export async function importLeadsAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const session = await assertRole(["admin", "coordinator"]);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Vui lòng chọn file CSV" };
  }
  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length === 0) {
    return { error: "File CSV trống" };
  }
  const dataRows = /ten|tên|sdt|sđt|facebook/i.test(rows[0].join(",")) ? rows.slice(1) : rows;

  const insert = db.prepare(
    `INSERT INTO leads (name, phone, phone_normalized, fb_name, fb_url, area, subject,
       learning_mode, need, source, received_at, status, temperature, owner_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'warm', ?, ?)`
  );

  let created = 0;
  let duplicated = 0;
  const errors: string[] = [];
  const today = todayISO();

  dataRows.forEach((cols, idx) => {
    const [name, phone, fbName, fbUrl, area, subject, mode, need, source, receivedAt, notes] =
      cols.map((c) => (c || "").trim());
    const lineNo = idx + 2; // trừ dòng tiêu đề

    if (!name) {
      errors.push(`Dòng ${lineNo}: thiếu tên khách hàng`);
      return;
    }
    if (!phone && !fbUrl && !fbName) {
      errors.push(`Dòng ${lineNo}: không có cách liên hệ nào (SĐT hoặc Facebook)`);
      return;
    }

    const phoneNormalized = normalizePhone(phone || "");
    if (phoneNormalized && findLeadsByPhone(phoneNormalized).length > 0) {
      duplicated++;
      return;
    }

    insert.run(
      name,
      phone || null,
      phoneNormalized || null,
      fbName || null,
      fbUrl || null,
      area || null,
      subject || "Guitar",
      parseLearningModeText(mode || ""),
      need || null,
      source || "Facebook Ads",
      /^\d{4}-\d{2}-\d{2}$/.test(receivedAt || "") ? receivedAt : today,
      session.userId,
      notes || null
    );
    created++;
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/report");

  let summary = `Đã thêm ${created} khách hàng tiềm năng.`;
  if (duplicated > 0) summary += ` Bỏ qua ${duplicated} dòng trùng SĐT đã có sẵn.`;
  if (errors.length > 0) {
    summary += ` Có ${errors.length} dòng lỗi:\n${errors.slice(0, 30).join("\n")}`;
    if (errors.length > 30) summary += `\n... và ${errors.length - 30} lỗi khác`;
  }
  return { summary };
}
