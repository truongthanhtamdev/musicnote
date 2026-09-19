/**
 * Thưởng giáo vụ.
 *
 * Hai mốc được thưởng, cộng dồn trên cùng một khách:
 *   • Buổi học thử dạy xong  → mức "thưởng học thử"
 *   • Khách đóng tiền lần đầu → CỘNG THÊM mức "thưởng chốt lớp"
 *
 * Nên một khách đi trọn đường từ học thử tới đóng tiền mang về tổng bằng hai
 * mức cộng lại (mặc định 25.000 + 75.000 = 100.000).
 *
 * Cả hai đều ghi thành một dòng trong `staff_bonuses` ngay lúc sự việc xảy ra,
 * kèm số tiền tại thời điểm đó. Không tính lại từ đầu mỗi lần mở báo cáo, vì
 * mức thưởng sửa được trong Cài đặt — sửa mức mới mà làm đổi luôn số tiền của
 * những khoản đã chốt tháng trước thì sổ sách sai ngay.
 */

import { db } from "./db";
import { getSetting, setSetting } from "./queries";
import { todayISO } from "./format";

export const BONUS_KEYS = {
  trial: "bonus_trial_amount",
  conversion: "bonus_conversion_amount",
} as const;

/**
 * Mức mặc định khi chủ trung tâm chưa khai gì trong Cài đặt.
 *
 * `conversion` là phần CỘNG THÊM lúc chốt, không phải tổng: 25.000 lúc học
 * thử rồi 75.000 lúc đóng tiền, cộng lại vừa đúng 100.000 cho một khách.
 */
export const DEFAULT_BONUS = { trial: 25_000, conversion: 75_000 };

function readAmount(key: string, fallback: number): number {
  const raw = getSetting(key);
  const n = raw == null ? NaN : Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

export function getBonusRates(): { trial: number; conversion: number } {
  return {
    trial: readAmount(BONUS_KEYS.trial, DEFAULT_BONUS.trial),
    conversion: readAmount(BONUS_KEYS.conversion, DEFAULT_BONUS.conversion),
  };
}

export function setBonusRates(trial: number, conversion: number) {
  setSetting(BONUS_KEYS.trial, String(Math.max(0, Math.round(trial))));
  setSetting(BONUS_KEYS.conversion, String(Math.max(0, Math.round(conversion))));
}

export type BonusKind = "trial" | "conversion" | "manual";

export interface BonusRow {
  id: number;
  staff_id: number;
  staff_name: string;
  kind: BonusKind;
  amount: number;
  ref_type: string;
  ref_id: number;
  note: string | null;
  earned_at: string;
}

/**
 * Ghi một khoản thưởng. Trùng khoá `(ref_type, ref_id)` thì bỏ qua — đó chính
 * là cơ chế chống thưởng hai lần cho cùng một sự việc.
 */
function award(opts: {
  staffId: number;
  kind: BonusKind;
  amount: number;
  refType: string;
  refId: number;
  note: string;
  earnedAt: string;
}) {
  if (opts.amount <= 0) return;
  db.prepare(
    `INSERT OR IGNORE INTO staff_bonuses (staff_id, kind, amount, ref_type, ref_id, note, earned_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(opts.staffId, opts.kind, opts.amount, opts.refType, opts.refId, opts.note, opts.earnedAt);
}

/**
 * Giáo vụ phụ trách một lớp. Trả null nếu lớp chưa gán ai — lúc đó không ghi
 * thưởng, thà thiếu còn hơn ghi nhầm người.
 */
function coordinatorOfClass(classId: number): number | null {
  const row = db
    .prepare("SELECT coordinator_id FROM classes WHERE id = ?")
    .get(classId) as { coordinator_id: number | null } | undefined;
  return row?.coordinator_id ?? null;
}

/**
 * Buổi học thử vừa được ghi là đã dạy.
 *
 * Mốc tính là buổi học thử THẬT SỰ diễn ra, chứ không phải lúc khách đăng ký —
 * khách hẹn rồi không tới thì công sức khác hẳn. Neo vào dòng điểm danh nên
 * giáo viên có sửa đi sửa lại cũng chỉ thưởng một lần.
 */
export function awardTrialBonus(attendanceId: number) {
  const a = db
    .prepare(
      `SELECT a.id, a.class_id, a.session_date, a.status, a.is_trial, c.student_name
       FROM attendance a JOIN classes c ON c.id = a.class_id WHERE a.id = ?`
    )
    .get(attendanceId) as
    | { id: number; class_id: number; session_date: string; status: string; is_trial: number; student_name: string }
    | undefined;
  if (!a || !a.is_trial || a.status !== "completed") return;

  const staffId = coordinatorOfClass(a.class_id);
  if (!staffId) return;

  award({
    staffId,
    kind: "trial",
    amount: getBonusRates().trial,
    refType: "attendance",
    refId: a.id,
    note: `Buổi học thử ${a.student_name} ngày ${a.session_date}`,
    earnedAt: a.session_date,
  });
}

/**
 * Khách vừa đóng tiền.
 *
 * Thưởng theo GÓI chứ không theo lớp và cũng không theo từng khoản thu: một
 * khách học thứ 2 và thứ 5 là hai dòng lớp nhưng chỉ là một lần chốt, và đóng
 * tiền làm ba đợt cũng vẫn là một lần chốt. Lớp không có gói thì neo vào chính
 * lớp đó.
 */
export function awardConversionBonus(paymentId: number) {
  const p = db
    .prepare(
      `SELECT p.id, p.class_id, p.paid_at, p.recorded_by, c.package_id, c.student_name
       FROM payments p LEFT JOIN classes c ON c.id = p.class_id WHERE p.id = ?`
    )
    .get(paymentId) as
    | { id: number; class_id: number | null; paid_at: string; recorded_by: number | null; package_id: number | null; student_name: string | null }
    | undefined;
  if (!p || !p.class_id) return;

  const staffId = coordinatorOfClass(p.class_id);
  if (!staffId) return;

  award({
    staffId,
    kind: "conversion",
    amount: getBonusRates().conversion,
    refType: p.package_id ? "package" : "class",
    refId: p.package_id ?? p.class_id,
    note: `Chốt lớp ${p.student_name ?? ""}`.trim(),
    earnedAt: p.paid_at,
  });
}

export interface BonusSummary {
  staff_id: number;
  staff_name: string;
  trial_count: number;
  trial_total: number;
  conversion_count: number;
  conversion_total: number;
  manual_total: number;
  total: number;
  rows: BonusRow[];
}

/** Thưởng trong kỳ, gom theo giáo vụ. */
export function listBonuses(from: string, to: string): BonusSummary[] {
  const rows = db
    .prepare(
      `SELECT b.id, b.staff_id, u.name as staff_name, b.kind, b.amount, b.ref_type, b.ref_id,
              b.note, b.earned_at
       FROM staff_bonuses b JOIN users u ON u.id = b.staff_id
       WHERE b.earned_at >= ? AND b.earned_at <= ?
       ORDER BY b.earned_at DESC, b.id DESC`
    )
    .all(from, to) as BonusRow[];

  const byStaff = new Map<number, BonusSummary>();
  for (const r of rows) {
    let s = byStaff.get(r.staff_id);
    if (!s) {
      s = {
        staff_id: r.staff_id,
        staff_name: r.staff_name,
        trial_count: 0,
        trial_total: 0,
        conversion_count: 0,
        conversion_total: 0,
        manual_total: 0,
        total: 0,
        rows: [],
      };
      byStaff.set(r.staff_id, s);
    }
    s.rows.push(r);
    s.total += r.amount;
    if (r.kind === "trial") {
      s.trial_count++;
      s.trial_total += r.amount;
    } else if (r.kind === "conversion") {
      s.conversion_count++;
      s.conversion_total += r.amount;
    } else {
      s.manual_total += r.amount;
    }
  }
  return [...byStaff.values()].sort((a, b) => b.total - a.total);
}

/** Thưởng của chính một giáo vụ, để họ tự xem phần của mình. */
export function listBonusesForStaff(staffId: number, from: string, to: string): BonusSummary | null {
  return listBonuses(from, to).find((s) => s.staff_id === staffId) ?? null;
}

/** Khoản cộng/trừ tay, cho trường hợp ngoài hai mốc tự động. */
export function addManualBonus(staffId: number, amount: number, note: string, date?: string) {
  db.prepare(
    `INSERT INTO staff_bonuses (staff_id, kind, amount, ref_type, ref_id, note, earned_at)
     VALUES (?, 'manual', ?, 'manual', ?, ?, ?)`
  ).run(
    staffId,
    Math.round(amount),
    // ref_id phải là số và phải không đụng dòng nào khác; dùng mốc thời gian.
    Date.now(),
    note || null,
    date || todayISO()
  );
}

export function deleteBonus(id: number) {
  db.prepare("DELETE FROM staff_bonuses WHERE id = ?").run(id);
}
