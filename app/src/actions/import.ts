"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { getUserByEmail } from "@/lib/auth";
import { parseCSV, parseDayOfWeek } from "@/lib/csv";
import { readXlsxRows } from "@/lib/xlsx";
import { findSlotClashes, normalizeName, parseCenterSheet } from "@/lib/center-sheet";
import { classStage } from "@/lib/types";
import { todayISO } from "@/lib/format";

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

/* -------------------------------------------------------------------------
 * Nhập bảng Excel "QUANLY_HV_GIAOVIEN" của trung tâm
 * ---------------------------------------------------------------------- */

export interface CenterImportState extends ImportState {
  /** Kết quả xem trước / đã nhập, để hiện bảng chi tiết. */
  report?: {
    dryRun: boolean;
    classes: number;
    created: number;
    updated: number;
    slotsAdded: number;
    slots: number;
    packages: number;
    teachersMatched: { sheetName: string; userName: string }[];
    teachersCreated: { name: string; email: string; password: string }[];
    stageCounts: [string, number][];
    clashes: { teacherName: string; dayLabel: string; a: string; b: string }[];
    warnings: { student: string; messages: string[] }[];
  };
}

/** Email tự sinh cho giáo viên chưa có tài khoản, từ tên đã bỏ dấu. */
function teacherEmailFrom(name: string, taken: Set<string>): string {
  const base =
    normalizeName(name).toLowerCase().replace(/\s+/g, ".").slice(0, 40) || "giaovien";
  let email = `${base}@musicnote.local`;
  let n = 2;
  while (taken.has(email)) email = `${base}${n++}@musicnote.local`;
  taken.add(email);
  return email;
}

/**
 * Nhập toàn bộ danh sách học viên từ file Excel của trung tâm và giao luôn lớp
 * cho giáo viên.
 *
 * Khớp giáo viên theo TÊN (bảng không có email): bỏ dấu và bỏ tiền tố
 * "GV"/"NBGV" rồi so — "GV THẮNG" khớp với giáo viên tên "Thắng" đã có. Tên
 * chưa có trong hệ thống thì tạo tài khoản mới kèm mật khẩu tạm, và trả mật
 * khẩu đó về màn hình để giáo vụ gửi cho giáo viên.
 *
 * Không gửi thông báo "được giao lớp mới" và không bật cờ buổi học thử: đây là
 * lớp đang học sẵn từ trước, không phải lớp trung tâm vừa giao.
 *
 * `dry_run` chỉ đọc và báo cáo, không ghi gì — luôn xem trước trước khi nhập
 * thật vì file này đưa vào vài trăm dòng một lúc.
 */
export async function importCenterSheetAction(
  _prev: CenterImportState,
  formData: FormData
): Promise<CenterImportState> {
  await assertRole(["admin"]);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Vui lòng chọn file Excel (.xlsx)" };
  }
  const dryRun = formData.get("commit") !== "1";

  let parsed;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    parsed = parseCenterSheet(readXlsxRows(buf));
  } catch (err) {
    return { error: `Không đọc được file: ${err instanceof Error ? err.message : "lỗi lạ"}` };
  }
  if (parsed.rows.length === 0) {
    return { error: "Không tìm thấy dòng học viên nào trong file" };
  }

  // Khớp giáo viên theo tên đã chuẩn hoá.
  const existingTeachers = db
    .prepare("SELECT id, name, email FROM users WHERE role = 'teacher'")
    .all() as { id: number; name: string; email: string }[];
  const byNormalName = new Map(existingTeachers.map((t) => [normalizeName(t.name), t]));
  const takenEmails = new Set(
    (db.prepare("SELECT email FROM users").all() as { email: string }[]).map((u) => u.email)
  );

  const matched: { sheetName: string; userName: string }[] = [];
  const created: { name: string; email: string; password: string }[] = [];
  const teacherIdByRow = new Map<number, number | null>();

  const sheetTeacherNames = [...new Set(parsed.rows.map((r) => r.teacherName).filter(Boolean))];
  const resolved = new Map<string, number | null>();
  for (const sheetName of sheetTeacherNames) {
    const key = normalizeName(sheetName);
    const hit = byNormalName.get(key);
    if (hit) {
      matched.push({ sheetName, userName: hit.name });
      resolved.set(sheetName, hit.id);
      continue;
    }
    const email = teacherEmailFrom(sheetName, takenEmails);
    const password = randomPassword();
    created.push({ name: sheetName, email, password });
    if (dryRun) {
      resolved.set(sheetName, null);
    } else {
      const info = db
        .prepare(
          "INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, 'teacher', 1)"
        )
        .run(sheetName, email, bcrypt.hashSync(password, 10));
      const id = Number(info.lastInsertRowid);
      resolved.set(sheetName, id);
      byNormalName.set(normalizeName(sheetName), { id, name: sheetName, email });
    }
  }
  for (const row of parsed.rows) {
    teacherIdByRow.set(row.rowNumber, resolved.get(row.teacherName) ?? null);
  }

  // Khớp theo mã lớp trong bảng ("G2403022"): nhập lại cùng một file thì cập
  // nhật lớp đã có chứ không tạo bản sao. Mã là duy nhất trong bảng nên đủ làm
  // khoá; lớp thêm tay trong hệ thống không có mã nên không bao giờ bị đụng.
  const existingByCode = new Map<string, { id: number; package_id: number | null }[]>();
  for (const row of db
    .prepare("SELECT id, code, package_id, day_of_week, start_time FROM classes WHERE code IS NOT NULL")
    .all() as {
    id: number;
    code: string;
    package_id: number | null;
    day_of_week: number;
    start_time: string;
  }[]) {
    const list = existingByCode.get(row.code) ?? [];
    list.push(row);
    existingByCode.set(row.code, list);
  }
  const existingSlotKeys = new Set(
    (
      db
        .prepare("SELECT code, day_of_week, start_time FROM classes WHERE code IS NOT NULL")
        .all() as { code: string; day_of_week: number; start_time: string }[]
    ).map((r) => `${r.code}|${r.day_of_week}|${r.start_time}`)
  );

  let classCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let slotsAdded = 0;
  let slotCount = 0;
  let packageCount = 0;
  const stageCounts = new Map<string, number>();

  const write = db.transaction(() => {
    const insertPackage = db.prepare(
      "INSERT INTO packages (total_sessions, bonus_sessions, course_count, started_at, used_override, used_override_set_at) VALUES (?, 0, ?, ?, ?, datetime('now'))"
    );
    const insertClass = db.prepare(
      `INSERT INTO classes (student_name, guardian_name, subject, language, source, package_id, schedule_type, day_of_week, start_time, duration_minutes, teacher_id, code, status, stage, trial_pending)
       VALUES (?, ?, ?, 'vi', 'center', ?, ?, ?, ?, 60, ?, ?, ?, ?, 0)`
    );

    const updateClass = db.prepare(
      `UPDATE classes SET student_name = ?, guardian_name = ?, subject = ?, teacher_id = ?,
                          status = ?, stage = ?
       WHERE id = ?`
    );
    const updatePackage = db.prepare(
      `UPDATE packages SET total_sessions = ?, course_count = ?, used_override = ?,
                           used_override_set_at = datetime('now')
       WHERE id = ?`
    );

    for (const row of parsed.rows) {
      const info = classStage(row.stage);
      stageCounts.set(info.label, (stageCounts.get(info.label) ?? 0) + 1);
      const teacherId = teacherIdByRow.get(row.rowNumber) ?? null;
      const existing = row.code ? (existingByCode.get(row.code) ?? []) : [];

      // Gói học: lớp đã có thì cập nhật đúng gói đang dùng, không tạo gói mới —
      // nếu không mỗi lần nhập lại là một gói mồ côi và tiến độ tiết reset.
      let packageId: number | null = existing.find((c) => c.package_id)?.package_id ?? null;
      if (row.registeredSessions) {
        packageCount++;
        if (!dryRun) {
          if (packageId) {
            updatePackage.run(
              row.registeredSessions,
              row.courseCount,
              row.usedSessions,
              packageId
            );
          } else {
            packageId = Number(
              insertPackage.run(
                row.registeredSessions,
                row.courseCount,
                row.startedAt ?? todayISO(),
                row.usedSessions
              ).lastInsertRowid
            );
          }
        }
      }

      if (existing.length > 0) {
        // Đã nhập lần trước: cập nhật thông tin, và chỉ thêm buổi nào chưa có.
        updatedCount += existing.length;
        classCount += existing.length;
        if (!dryRun) {
          for (const c of existing) {
            updateClass.run(
              row.studentName,
              row.guardianName,
              row.subject,
              teacherId,
              info.status,
              info.value,
              c.id
            );
            if (packageId && !c.package_id) {
              db.prepare("UPDATE classes SET package_id = ? WHERE id = ?").run(packageId, c.id);
            }
          }
        }
        for (const slot of row.slots) {
          slotCount++;
          const key = `${row.code}|${slot.dayOfWeek}|${slot.startTime}`;
          if (existingSlotKeys.has(key)) continue;
          existingSlotKeys.add(key);
          slotsAdded++;
          classCount++;
          if (dryRun) continue;
          insertClass.run(
            row.studentName,
            row.guardianName,
            row.subject,
            packageId,
            "fixed",
            slot.dayOfWeek,
            slot.startTime,
            teacherId,
            row.code,
            info.status,
            info.value
          );
        }
        continue;
      }

      // Lớp chưa có lịch cố định (đa số lớp Tạm OFF) vào hệ thống dạng linh
      // động: giữ được học viên, gói học và trạng thái, xếp lịch sau.
      const slots = row.slots.length > 0 ? row.slots : [null];
      for (const slot of slots) {
        classCount++;
        createdCount++;
        if (slot) {
          slotCount++;
          existingSlotKeys.add(`${row.code}|${slot.dayOfWeek}|${slot.startTime}`);
        }
        if (dryRun) continue;
        insertClass.run(
          row.studentName,
          row.guardianName,
          row.subject,
          packageId,
          slot ? "fixed" : "flexible",
          slot ? slot.dayOfWeek : -1,
          slot ? slot.startTime : "",
          teacherId,
          row.code || null,
          info.status,
          info.value
        );
      }
    }
  });
  write();

  if (!dryRun) {
    revalidatePath("/admin");
    revalidatePath("/admin/classes");
    revalidatePath("/admin/teachers");
    revalidatePath("/admin/packages");
  }

  const changes =
    updatedCount > 0
      ? `${createdCount} lớp mới, ${updatedCount} lớp cập nhật` +
        (slotsAdded > 0 ? `, ${slotsAdded} buổi thêm mới` : "")
      : `${createdCount} lớp mới`;

  return {
    summary: dryRun
      ? `Xem trước ${parsed.rows.length} học viên: ${changes}. Chưa ghi gì vào hệ thống.`
      : `Đã nhập ${parsed.rows.length} học viên: ${changes}.`,
    report: {
      dryRun,
      classes: classCount,
      created: createdCount,
      updated: updatedCount,
      slotsAdded,
      slots: slotCount,
      packages: packageCount,
      teachersMatched: matched,
      teachersCreated: created,
      stageCounts: [...stageCounts.entries()].sort((a, b) => b[1] - a[1]),
      clashes: findSlotClashes(parsed.rows),
      warnings: parsed.rows
        .filter((r) => r.warnings.length > 0)
        .map((r) => ({ student: r.studentName, messages: r.warnings })),
    },
  };
}
