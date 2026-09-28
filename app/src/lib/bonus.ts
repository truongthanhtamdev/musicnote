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
 * Khách này đã có thưởng chốt lớp chưa — xét CẢ HAI khoá.
 *
 * Khoá chống trùng của bảng thưởng là (loại, mã), mà cùng một lần chốt có
 * thể được ghi theo lớp (lúc lớp chưa có gói) rồi sau đó theo gói (khi ghi
 * học phí thì gói mới được tạo). Chỉ dựa vào ràng buộc UNIQUE thì hai khoá
 * khác nhau lọt qua và nhân viên được cộng 75k hai lần. Nên trước khi ghi phải
 * dò cả khoản theo lớp (của lớp này hoặc lớp cùng gói) lẫn khoản theo gói.
 */
const CONVERSION_EXISTS_SQL = `
  SELECT 1 FROM staff_bonuses b
  WHERE b.kind = 'conversion' AND (
    (b.ref_type = 'package' AND @pkg IS NOT NULL AND b.ref_id = @pkg)
    OR (b.ref_type = 'class' AND b.ref_id IN (
      SELECT x.id FROM classes x WHERE x.id = @cls OR (@pkg IS NOT NULL AND x.package_id = @pkg)
    ))
  ) LIMIT 1`;

function hasConversionBonus(classId: number, packageId: number | null): boolean {
  return !!db.prepare(CONVERSION_EXISTS_SQL).get({ cls: classId, pkg: packageId });
}

/** Các bước coi là đã chốt: khách vào học chính thức. */
export const CONVERTED_STAGES = ["studying", "studying_unpaid", "studying_partial", "new_course_paid"];

/**
 * Ghi thưởng chốt lớp cho một lớp.
 *
 * Thưởng theo GÓI chứ không theo lớp và cũng không theo từng khoản thu: một
 * khách học thứ 2 và thứ 5 là hai dòng lớp nhưng chỉ là một lần chốt, và đóng
 * tiền làm ba đợt cũng vẫn là một lần chốt. Lớp không có gói thì neo vào chính
 * lớp đó. Có ba đường dẫn tới đây (ghi tiền ở trang Doanh thu, ghi tiền khi
 * lưu gói ở trang lớp, đổi trạng thái lớp sang Đang học) — cùng một khoá chống
 * trùng nên đi đường nào, bao nhiêu lần, cũng chỉ ghi một khoản.
 */
export function awardConversionForClass(classId: number, earnedAt: string) {
  const c = db
    .prepare("SELECT id, package_id, student_name FROM classes WHERE id = ?")
    .get(classId) as { id: number; package_id: number | null; student_name: string } | undefined;
  if (!c) return;
  if (hasConversionBonus(c.id, c.package_id)) return;

  const staffId = coordinatorOfClass(c.id);
  if (!staffId) return;

  award({
    staffId,
    kind: "conversion",
    amount: getBonusRates().conversion,
    refType: c.package_id ? "package" : "class",
    refId: c.package_id ?? c.id,
    note: `Chốt lớp ${c.student_name}`.trim(),
    earnedAt,
  });
}

/** Khách vừa đóng tiền (một dòng trong bảng payments). */
export function awardConversionBonus(paymentId: number) {
  const p = db.prepare("SELECT class_id, paid_at FROM payments WHERE id = ?").get(paymentId) as
    | { class_id: number | null; paid_at: string }
    | undefined;
  if (!p || !p.class_id) return;
  awardConversionForClass(p.class_id, p.paid_at);
}

/** Một buổi học thử đã dạy xong mà chưa có khoản thưởng nào đi kèm. */
export interface UnrewardedTrial {
  attendance_id: number;
  class_id: number;
  student_name: string;
  session_date: string;
  coordinator_id: number | null;
  coordinator_name: string | null;
}

/**
 * Buổi học thử trong kỳ chưa được ghi thưởng.
 *
 * Khoản thưởng chỉ được ghi ĐÚNG LÚC điểm danh, nên có mấy đường rơi rớt:
 * lớp lúc đó chưa gán giáo vụ, buổi dạy xong trước khi tính năng thưởng ra
 * đời, hay dữ liệu được sửa tay. Bảng này lôi hết ra ánh sáng kèm lý do,
 * thay vì để chủ trung tâm ngồi dò "hình như thiếu một lớp".
 *
 * Lưu ý: khoản đã Gỡ tay cũng hiện lại ở đây, vì gỡ là xoá hẳn dòng ghi.
 */
export function listUnrewardedTrials(from: string, to: string): UnrewardedTrial[] {
  return db
    .prepare(
      `SELECT a.id AS attendance_id, a.class_id, c.student_name, a.session_date,
              c.coordinator_id, u.name AS coordinator_name
       FROM attendance a
       JOIN classes c ON c.id = a.class_id
       LEFT JOIN users u ON u.id = c.coordinator_id
       WHERE a.is_trial = 1 AND a.status = 'completed'
         AND a.session_date >= ? AND a.session_date <= ?
         AND NOT EXISTS (
           SELECT 1 FROM staff_bonuses b
           WHERE b.ref_type = 'attendance' AND b.ref_id = a.id
         )
       ORDER BY a.session_date`
    )
    .all(from, to) as UnrewardedTrial[];
}

/** Một khách đã chốt mà chưa có thưởng chốt lớp. */
export interface UnrewardedConversion {
  class_id: number;
  student_name: string;
  /** Ngày dùng để ghi thưởng: ngày đóng tiền, hoặc ngày học thử nếu chốt bằng đổi trạng thái. */
  paid_at: string;
  coordinator_id: number | null;
  coordinator_name: string | null;
}

/**
 * Khách đã chốt trong kỳ mà chưa có thưởng chốt lớp. "Đã chốt" là một trong
 * hai dấu hiệu:
 *   • có khoản thu trong kỳ, hoặc
 *   • đã học thử trong kỳ VÀ lớp đang ở trạng thái đã chốt (Đang học...)
 * Dấu hiệu thứ hai để bắt những lần chốt bằng đổi trạng thái mà không ghi
 * tiền — trước đây không để lại dấu vết gì, nên không truy lại được.
 * Mỗi gói (hoặc lớp không gói) chỉ hiện một lần.
 */
export function listUnrewardedConversions(from: string, to: string): UnrewardedConversion[] {
  const stages = CONVERTED_STAGES.map((s) => `'${s}'`).join(",");
  return db
    .prepare(
      `WITH cand AS (
         SELECT p.class_id AS class_id, p.paid_at AS at
         FROM payments p
         WHERE p.class_id IS NOT NULL AND p.paid_at >= @from AND p.paid_at <= @to
         UNION ALL
         SELECT a.class_id, a.session_date
         FROM attendance a JOIN classes c2 ON c2.id = a.class_id
         WHERE a.is_trial = 1 AND a.status = 'completed'
           AND a.session_date >= @from AND a.session_date <= @to
           AND c2.stage IN (${stages})
       )
       SELECT c.id AS class_id, c.student_name, MIN(cand.at) AS paid_at,
              c.coordinator_id, u.name AS coordinator_name
       FROM cand
       JOIN classes c ON c.id = cand.class_id
       LEFT JOIN users u ON u.id = c.coordinator_id
       WHERE NOT EXISTS (
         SELECT 1 FROM staff_bonuses b
         WHERE b.kind = 'conversion' AND (
           (b.ref_type = 'package' AND c.package_id IS NOT NULL AND b.ref_id = c.package_id)
           OR (b.ref_type = 'class' AND b.ref_id IN (
             SELECT x.id FROM classes x
             WHERE x.id = c.id OR (c.package_id IS NOT NULL AND x.package_id = c.package_id)
           ))
         )
       )
       GROUP BY COALESCE('p' || c.package_id, 'c' || c.id)
       ORDER BY paid_at`
    )
    .all({ from, to }) as UnrewardedConversion[];
}

/**
 * Chuyển mọi khoản thưởng gắn với một khách sang người phụ trách mới.
 *
 * "Gắn với khách" gồm: thưởng học thử của các buổi điểm danh thuộc lớp này,
 * và thưởng chốt lớp ghi theo lớp này, theo lớp cùng gói, hoặc theo gói.
 * Khoản ghi tay không đụng tới — đó là quyết định riêng của người ghi.
 */
export function transferClassBonuses(classId: number, toStaffId: number): { n: number; total: number } {
  const c = db.prepare("SELECT package_id FROM classes WHERE id = ?").get(classId) as
    | { package_id: number | null }
    | undefined;
  if (!c) return { n: 0, total: 0 };

  const where = `
    staff_id != @to AND (
      (kind = 'trial' AND ref_type = 'attendance'
        AND ref_id IN (SELECT id FROM attendance WHERE class_id IN (
          SELECT x.id FROM classes x WHERE x.id = @cls OR (@pkg IS NOT NULL AND x.package_id = @pkg)
        )))
      OR (kind = 'conversion' AND (
        (ref_type = 'package' AND @pkg IS NOT NULL AND ref_id = @pkg)
        OR (ref_type = 'class' AND ref_id IN (
          SELECT x.id FROM classes x WHERE x.id = @cls OR (@pkg IS NOT NULL AND x.package_id = @pkg)
        ))
      ))
    )`;
  const params = { to: toStaffId, cls: classId, pkg: c.package_id };
  const sum = db
    .prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS total FROM staff_bonuses WHERE ${where}`)
    .get(params) as { n: number; total: number };
  if (sum.n > 0) {
    db.prepare(`UPDATE staff_bonuses SET staff_id = @to WHERE ${where}`).run(params);
  }
  return sum;
}

/**
 * Mọi dòng lớp của cùng một khách: chính lớp này và các buổi khác trong tuần
 * dùng chung gói (khách học T2 + T5 là hai dòng lớp, một gói).
 */
export function customerClassIds(classId: number): number[] {
  const c = db.prepare("SELECT id, package_id FROM classes WHERE id = ?").get(classId) as
    | { id: number; package_id: number | null }
    | undefined;
  if (!c) return [];
  if (!c.package_id) return [c.id];
  return (db.prepare("SELECT id FROM classes WHERE package_id = ?").all(c.package_id) as { id: number }[]).map(
    (r) => r.id
  );
}

export interface CustomerBonusStatus {
  /** Các buổi được điểm danh là học thử và đã dạy xong. */
  trials: { attendanceId: number; date: string; holder: string | null; amount: number | null }[];
  /** Khoản chốt lớp đã ghi; null là chưa có. */
  conversion: { holder: string; amount: number } | null;
  /** Khách có dấu hiệu đã chốt chưa (đã đóng tiền, hoặc lớp đang ở trạng thái Đang học...). */
  converted: boolean;
}

/**
 * Tình trạng thưởng của MỘT khách, để hiện ngay trên trang lớp.
 *
 * Sinh ra vì "sao chưa nhảy tiền" là câu hỏi không trả lời được nếu chỉ nhìn
 * trang Thưởng: khoản có thể đang nằm ở người khác, có thể chưa ghi vì buổi
 * học thử không được đánh dấu, hoặc vì khách chưa chốt. Hiện đủ ba thứ đó ở
 * đúng chỗ người ta đang đứng thì khỏi phải đoán.
 */
export function customerBonusStatus(classId: number): CustomerBonusStatus {
  const ids = customerClassIds(classId);
  if (ids.length === 0) return { trials: [], conversion: null, converted: false };
  const ph = ids.map(() => "?").join(",");

  const trials = db
    .prepare(
      `SELECT a.id AS attendanceId, a.session_date AS date, u.name AS holder, b.amount AS amount
       FROM attendance a
       LEFT JOIN staff_bonuses b ON b.ref_type = 'attendance' AND b.ref_id = a.id AND b.kind = 'trial'
       LEFT JOIN users u ON u.id = b.staff_id
       WHERE a.class_id IN (${ph}) AND a.is_trial = 1 AND a.status = 'completed'
       ORDER BY a.session_date`
    )
    .all(...ids) as CustomerBonusStatus["trials"];

  const c = db.prepare("SELECT package_id FROM classes WHERE id = ?").get(classId) as { package_id: number | null };
  const conversion = db
    .prepare(
      `SELECT u.name AS holder, b.amount AS amount
       FROM staff_bonuses b JOIN users u ON u.id = b.staff_id
       WHERE b.kind = 'conversion' AND (
         (b.ref_type = 'package' AND ? IS NOT NULL AND b.ref_id = ?)
         OR (b.ref_type = 'class' AND b.ref_id IN (${ph}))
       ) LIMIT 1`
    )
    .get(c.package_id, c.package_id, ...ids) as { holder: string; amount: number } | undefined;

  const stages = CONVERTED_STAGES.map((st) => `'${st}'`).join(",");
  const converted = !!db
    .prepare(
      `SELECT 1 FROM classes WHERE id IN (${ph}) AND (
         stage IN (${stages}) OR EXISTS (SELECT 1 FROM payments p WHERE p.class_id = classes.id)
       ) LIMIT 1`
    )
    .get(...ids);

  return { trials, conversion: conversion ?? null, converted };
}

/**
 * Ghi các khoản còn thiếu cho một khách, theo người phụ trách hiện tại.
 * Người bấm là Quản lý đang nhìn đúng khách này, nên tính "đã chốt" rộng hơn
 * lúc tự động: có khoản thu HOẶC lớp đang ở trạng thái đã chốt là đủ.
 */
export function awardMissingForCustomer(classId: number): { trials: number; conversion: number } {
  const before = customerBonusStatus(classId);
  for (const t of before.trials) if (!t.holder) awardTrialBonus(t.attendanceId);
  if (!before.conversion && before.converted) {
    const firstPaid = db
      .prepare(
        `SELECT MIN(paid_at) AS d FROM payments WHERE class_id IN (${customerClassIds(classId).map(() => "?").join(",")})`
      )
      .get(...customerClassIds(classId)) as { d: string | null };
    awardConversionForClass(classId, firstPaid.d ?? before.trials[0]?.date ?? todayISO());
  }
  const after = customerBonusStatus(classId);
  return {
    trials: after.trials.filter((t) => t.holder).length - before.trials.filter((t) => t.holder).length,
    conversion: !before.conversion && after.conversion ? 1 : 0,
  };
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
