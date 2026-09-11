import { excelSerialToISO } from "./xlsx";
import { foldVietnamese } from "./format";
import { CLASS_STAGES, DAY_LABELS, type ClassStage } from "./types";

/**
 * Đọc bảng Excel "QUANLY_HV_GIAOVIEN" của trung tâm thành dữ liệu hệ thống.
 *
 * Bảng này gõ tay nhiều năm nên nhiều ô lệch chuẩn (giờ ghi "8H", "H7",
 * "10H / 9H", thứ ghi nhầm thành số...). Nguyên tắc: cái nào đoán được chắc
 * chắn thì tự gán, cái nào không thì bỏ qua ô đó và ghi lại một cảnh báo —
 * không bao giờ đoán bừa rồi ghi số sai vào lịch học.
 */

/** Thứ tự cột trong file, đúng như bảng trung tâm đang dùng. */
export const SHEET_COLUMNS = {
  code: 1, // MÃ
  customer: 2, // TÊN KHÁCH HÀNG
  student: 3, // TÊN HỌC SINH
  teacher: 4, // GV
  day1: 5,
  day2: 6,
  day3: 7,
  time: 8, // GIO HOC
  course1: 9, // KHÓA 1..8 = số tiết của từng khóa
  currentCourse: 17, // KHÓA ĐANG HỌC
  usedSessions: 18, // SỐ TIẾT ĐÃ HỌC KHÓA HIỆN TẠI
  stage: 19, // TRANG THAI KHOA HOC
  trialDate: 20, // NGÀY HỌC THỬ
  startDate: 21, // NGÀY BẮT ĐẦU
} as const;

const COURSE_COLUMNS = [9, 10, 11, 12, 13, 14, 15, 16];

/** Bỏ dấu, bỏ tiền tố "GV"/"NBGV", gom khoảng trắng — để so tên giáo viên. */
export function normalizeName(value: string): string {
  return foldVietnamese(value)
    .toUpperCase()
    .replace(/\b(NBGV|GV)\b/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/** "T2".."T7"/"CN" thành 1..6/0. Trả về null cho ô ghi sai (VD "103"). */
export function parseDay(value: string): number | null {
  const v = value.trim().toUpperCase();
  if (!v) return null;
  if (v === "CN") return 0;
  const m = v.match(/^T([2-7])$/);
  return m ? Number(m[1]) - 1 : null;
}

/**
 * "8H" → "08:00", "16H30" → "16:30", "7H15" → "07:15", "H7" → "07:00".
 * Một ô có thể ghi nhiều giờ cho nhiều buổi ("10H / 9H"), nên trả về mảng.
 * Ô ghi "LINH ĐỘNG"/"LỊCH THEO TUẦN" trả về mảng rỗng — lớp đó hẹn từng buổi.
 */
export function parseTimes(value: string): string[] {
  const out: string[] = [];
  for (const part of value.split(/[/,]/)) {
    const v = part.trim().toUpperCase();
    if (!v || /LINH|TUAN|TUẦN/i.test(normalizeName(v))) continue;
    // "H7" là gõ ngược của "7H"; bắt cả hai thứ tự.
    const m = v.match(/^(\d{1,2})\s*H\s*(\d{2})?$/) ?? v.match(/^H\s*(\d{1,2})()$/);
    if (!m) continue;
    const hour = Number(m[1]);
    const minute = Number(m[2] || 0);
    if (hour > 23 || minute > 59) continue;
    out.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }
  return out;
}

const STAGE_BY_LABEL = new Map(
  CLASS_STAGES.map((s) => [normalizeName(s.label).replace(/\s+/g, " "), s.value])
);

/** Khớp "TRANG THAI KHOA HOC" với 14 trạng thái của hệ thống, bỏ qua khác biệt dấu gạch. */
export function parseStage(value: string): ClassStage | null {
  const key = normalizeName(value).replace(/\s+/g, " ");
  return STAGE_BY_LABEL.get(key) ?? null;
}

/** Mã lớp cho biết bộ môn: G=Guitar, P=Piano, V=Violin, T=Thanh nhạc. */
export function subjectFromCode(code: string): string | null {
  const map: Record<string, string> = { G: "Guitar", P: "Piano", V: "Violin", T: "Thanh nhạc" };
  return map[code.trim().charAt(0).toUpperCase()] ?? null;
}

export interface ParsedSlot {
  dayOfWeek: number;
  startTime: string;
}

export interface ParsedStudentRow {
  rowNumber: number;
  code: string;
  studentName: string;
  guardianName: string | null;
  teacherName: string;
  subject: string;
  /** Rỗng nghĩa là lớp chưa có lịch cố định → nhập vào dạng linh động. */
  slots: ParsedSlot[];
  stage: ClassStage;
  /** Số tiết của khóa đang học; null nếu bảng không ghi. */
  registeredSessions: number | null;
  usedSessions: number;
  courseCount: number;
  startedAt: string | null;
  warnings: string[];
}

export interface ParseResult {
  rows: ParsedStudentRow[];
  /** Dòng không dùng được (thiếu tên học viên chẳng hạn). */
  skipped: { rowNumber: number; reason: string }[];
}

/**
 * Chuyển toàn bộ bảng thành danh sách lớp. Mỗi cảnh báo nói rõ dòng nào, ô nào
 * lệch chuẩn và hệ thống đã xử lý ra sao, để giáo vụ soát lại sau khi nhập.
 */
export function parseCenterSheet(rows: string[][]): ParseResult {
  const out: ParsedStudentRow[] = [];
  const skipped: { rowNumber: number; reason: string }[] = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 1;
    if (i === 0) return; // dòng tiêu đề
    const cell = (idx: number) => (row[idx] ?? "").trim();

    const studentName = cell(SHEET_COLUMNS.student) || cell(SHEET_COLUMNS.customer);
    if (!studentName) return; // dòng trống ở cuối bảng

    const warnings: string[] = [];
    const code = cell(SHEET_COLUMNS.code);
    const customer = cell(SHEET_COLUMNS.customer);

    const subject = subjectFromCode(code);
    if (!subject && code) {
      warnings.push(`mã "${code}" chưa rõ bộ môn, tạm để Guitar`);
    }

    const stage = parseStage(cell(SHEET_COLUMNS.stage));
    if (!stage && cell(SHEET_COLUMNS.stage)) {
      warnings.push(`trạng thái "${cell(SHEET_COLUMNS.stage)}" không khớp, tạm để Đang học`);
    }

    // Mỗi ngày học ghép với một giờ; ô giờ ghi một giá trị thì mọi buổi dùng
    // chung giờ đó, ghi "10H / 9H" thì buổi 1 giờ đầu, buổi 2 giờ sau.
    const times = parseTimes(cell(SHEET_COLUMNS.time));
    const dayCells = [SHEET_COLUMNS.day1, SHEET_COLUMNS.day2, SHEET_COLUMNS.day3].map(cell);
    const slots: ParsedSlot[] = [];
    dayCells.forEach((raw, slotIdx) => {
      if (!raw) return;
      const day = parseDay(raw);
      if (day === null) {
        warnings.push(`lịch ${slotIdx + 1} ghi "${raw}" không phải thứ, đã bỏ qua`);
        return;
      }
      const time = times[slotIdx] ?? times[0];
      if (!time) {
        const raw = cell(SHEET_COLUMNS.time);
        warnings.push(
          raw
            ? `lịch ${DAY_LABELS[day]} ghi giờ là "${raw}", để lịch linh động`
            : `có lịch ${DAY_LABELS[day]} nhưng bỏ trống giờ, để lịch linh động`
        );
        return;
      }
      slots.push({ dayOfWeek: day, startTime: time });
    });
    if (dayCells.some(Boolean) && times.length > slots.length && times.length > 1) {
      warnings.push(`ô giờ ghi ${times.length} giờ nhưng chỉ có ${slots.length} buổi dùng được`);
    }

    const courseCountRaw = Number(cell(SHEET_COLUMNS.currentCourse));
    const courseCount =
      Number.isInteger(courseCountRaw) && courseCountRaw > 0 ? courseCountRaw : 1;
    // Số tiết của khóa ĐANG học nằm ở cột "KHÓA <n>" tương ứng.
    const registeredRaw = cell(COURSE_COLUMNS[courseCount - 1] ?? -1);
    const registered = Number(registeredRaw);
    const registeredSessions = Number.isInteger(registered) && registered > 0 ? registered : null;
    if (!registeredSessions && cell(SHEET_COLUMNS.currentCourse)) {
      warnings.push("chưa rõ số tiết của khóa đang học, không tạo gói");
    }

    const usedRaw = Number(cell(SHEET_COLUMNS.usedSessions));
    let used = Number.isInteger(usedRaw) && usedRaw >= 0 ? usedRaw : 0;
    if (registeredSessions && used > registeredSessions) {
      warnings.push(`đã học ${used} tiết vượt quá gói ${registeredSessions} tiết, cắt về ${registeredSessions}`);
      used = registeredSessions;
    }

    out.push({
      rowNumber,
      code,
      studentName,
      guardianName: customer && customer !== studentName ? customer : null,
      teacherName: cell(SHEET_COLUMNS.teacher),
      subject: subject ?? "Guitar",
      slots,
      stage: stage ?? "studying",
      registeredSessions,
      usedSessions: used,
      courseCount,
      startedAt:
        excelSerialToISO(cell(SHEET_COLUMNS.startDate)) ??
        excelSerialToISO(cell(SHEET_COLUMNS.trialDate)),
      warnings,
    });
  });

  return { rows: out, skipped };
}

export interface SlotClash {
  teacherName: string;
  dayLabel: string;
  a: string;
  b: string;
}

/**
 * Hai lớp của cùng một giáo viên đè giờ lên nhau. Bảng gõ tay nên chuyện này
 * có thật — có thể là lớp nhóm hai người, cũng có thể là gõ nhầm giờ. Không
 * chặn nhập (bảng là dữ liệu đang chạy thật), chỉ liệt kê ra để soát.
 */
export function findSlotClashes(rows: ParsedStudentRow[], durationMinutes = 60): SlotClash[] {
  const byTeacherDay = new Map<string, { name: string; start: number; end: number }[]>();
  for (const row of rows) {
    if (!row.teacherName) continue;
    for (const slot of row.slots) {
      const [h, m] = slot.startTime.split(":").map(Number);
      const start = h * 60 + m;
      const key = `${row.teacherName}|${slot.dayOfWeek}`;
      const list = byTeacherDay.get(key) ?? [];
      list.push({
        name: `${row.studentName} ${slot.startTime}`,
        start,
        end: start + durationMinutes,
      });
      byTeacherDay.set(key, list);
    }
  }

  const out: SlotClash[] = [];
  for (const [key, list] of byTeacherDay) {
    const [teacherName, day] = key.split("|");
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].start < list[j].end && list[i].end > list[j].start) {
          out.push({
            teacherName,
            dayLabel: DAY_LABELS[Number(day)],
            a: list[i].name,
            b: list[j].name,
          });
        }
      }
    }
  }
  return out;
}
