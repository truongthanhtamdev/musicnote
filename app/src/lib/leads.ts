/**
 * Khách tiềm năng — người đã hỏi han nhưng chưa đặt lịch học thử.
 *
 * Mục đích chính không phải lưu trữ mà là NHẮC. Khách nhắn "hai tuần nữa chị
 * về chị liên hệ em" là khách rất tiềm năng, nhưng nằm trong hộp thư Facebook
 * cùng vài trăm cuộc khác thì hai tuần sau không ai nhớ. Có ngày hẹn trong
 * bảng này thì hệ thống nhắc, không có thì mất khách.
 */

import { db } from "./db";
import { todayISO } from "./format";
import { getSetting, setSetting } from "./queries";
import { LEAD_STAGES, OPEN_STAGES, type LeadRow, type LeadStage } from "./lead-types";

export * from "./lead-types";

const SELECT = `
  SELECT l.*, u.name as coordinator_name
  FROM leads l LEFT JOIN users u ON u.id = l.coordinator_id
`;

export function listLeads(filter?: { stage?: LeadStage | "all" }): LeadRow[] {
  const stage = filter?.stage;
  if (stage && stage !== "all") {
    return db
      .prepare(`${SELECT} WHERE l.stage = ? ORDER BY l.updated_at DESC, l.id DESC`)
      .all(stage) as LeadRow[];
  }
  // Khách còn phải chăm lên trước, trong đó hẹn sớm nhất lên đầu; khách đã
  // xong (chốt hoặc bỏ) xuống cuối.
  return db
    .prepare(
      `${SELECT}
       ORDER BY
         CASE WHEN l.stage IN ('won','lost') THEN 1 ELSE 0 END,
         CASE WHEN l.next_follow_up IS NULL THEN 1 ELSE 0 END,
         l.next_follow_up,
         l.updated_at DESC`
    )
    .all() as LeadRow[];
}

export function getLead(id: number): LeadRow | undefined {
  return db.prepare(`${SELECT} WHERE l.id = ?`).get(id) as LeadRow | undefined;
}

/**
 * Khách tới hạn liên hệ: đã hẹn một ngày, ngày đó là hôm nay hoặc đã qua, và
 * vẫn còn đang theo. Đây là danh sách việc phải làm trong ngày của giáo vụ.
 */
export function listDueLeads(): LeadRow[] {
  const open = OPEN_STAGES.map(() => "?").join(",");
  return db
    .prepare(
      `${SELECT}
       WHERE l.next_follow_up IS NOT NULL AND l.next_follow_up <= ?
         AND l.stage IN (${open})
       ORDER BY l.next_follow_up, l.id`
    )
    .all(todayISO(), ...OPEN_STAGES) as LeadRow[];
}

export function countDueLeads(): number {
  const open = OPEN_STAGES.map(() => "?").join(",");
  const row = db
    .prepare(
      `SELECT COUNT(*) as c FROM leads
       WHERE next_follow_up IS NOT NULL AND next_follow_up <= ?
         AND stage IN (${open})`
    )
    .get(todayISO(), ...OPEN_STAGES) as { c: number };
  return row.c;
}

export function countByStage(): Record<LeadStage, number> {
  const out = Object.fromEntries(LEAD_STAGES.map((s) => [s, 0])) as Record<LeadStage, number>;
  for (const r of db.prepare("SELECT stage, COUNT(*) as c FROM leads GROUP BY stage").all() as {
    stage: LeadStage;
    c: number;
  }[]) {
    out[r.stage] = r.c;
  }
  return out;
}

export function createLead(data: {
  name: string;
  phone?: string | null;
  facebookUrl?: string | null;
  subject?: string | null;
  source?: string | null;
  stage?: LeadStage;
  nextFollowUp?: string | null;
  note?: string | null;
  coordinatorId?: number | null;
}): number {
  const info = db
    .prepare(
      `INSERT INTO leads (name, phone, facebook_url, subject, source, stage, next_follow_up, note, coordinator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.name,
      data.phone || null,
      data.facebookUrl || null,
      data.subject || null,
      data.source || null,
      data.stage ?? "new",
      data.nextFollowUp || null,
      data.note || null,
      data.coordinatorId ?? null
    );
  return Number(info.lastInsertRowid);
}

export function updateLead(
  id: number,
  data: Partial<{
    name: string;
    phone: string | null;
    facebookUrl: string | null;
    subject: string | null;
    source: string | null;
    stage: LeadStage;
    nextFollowUp: string | null;
    note: string | null;
    coordinatorId: number | null;
    convertedClassId: number | null;
  }>
) {
  const map: Record<string, string> = {
    name: "name",
    phone: "phone",
    facebookUrl: "facebook_url",
    subject: "subject",
    source: "source",
    stage: "stage",
    nextFollowUp: "next_follow_up",
    note: "note",
    coordinatorId: "coordinator_id",
    convertedClassId: "converted_class_id",
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [key, col] of Object.entries(map)) {
    if (key in data) {
      sets.push(`${col} = ?`);
      vals.push((data as Record<string, unknown>)[key] ?? null);
    }
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  db.prepare(`UPDATE leads SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
}

export function deleteLead(id: number) {
  db.prepare("DELETE FROM leads WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// Nguồn khách
// ---------------------------------------------------------------------------

export const LEAD_SOURCES_KEY = "lead_sources";

/**
 * Nguồn mặc định. Cố ý tách RIÊNG từng fanpage chứ không gộp thành "Quảng cáo
 * Facebook": gộp lại thì mãi mãi không biết trang nào ra khách tốt, mà đó lại
 * đúng là câu cần trả lời để quyết định đổ tiền quảng cáo vào đâu.
 */
export const DEFAULT_LEAD_SOURCES = [
  "Fanpage Piano Guitar Đệm Hát",
  "Fanpage Guitar Online 1:1",
  "Fanpage Tiếng Việt",
  "Zalo",
  "Giới thiệu",
  "Tự tìm thấy web",
  "Khác",
];

export function getLeadSources(): string[] {
  const raw = getSetting(LEAD_SOURCES_KEY);
  if (!raw) return DEFAULT_LEAD_SOURCES;
  const list = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : DEFAULT_LEAD_SOURCES;
}

export function setLeadSources(list: string[]) {
  setSetting(LEAD_SOURCES_KEY, list.map((s) => s.trim()).filter(Boolean).join("\n"));
}

export interface SourceStat {
  source: string;
  total: number;
  trial: number;
  won: number;
  lost: number;
  /** Phần trăm khách của nguồn này chốt được lớp. */
  winRate: number;
}

/**
 * Hiệu quả từng nguồn: bao nhiêu khách, bao nhiêu người đặt học thử, bao
 * nhiêu chốt.
 *
 * "Đã đặt học thử" đếm cả những người sau đó chốt hoặc bỏ, vì một khách đã
 * chốt thì chắc chắn từng qua bước học thử — không cộng dồn thì nguồn nào
 * chuyển đổi tốt lại hiện ra số học thử thấp, ngược đời.
 */
export function statsBySource(): SourceStat[] {
  const rows = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(source), ''), 'Chưa rõ') AS source,
              COUNT(*) AS total,
              SUM(CASE WHEN stage IN ('trial_booked','won') THEN 1 ELSE 0 END) AS trial,
              SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) AS won,
              SUM(CASE WHEN stage = 'lost' THEN 1 ELSE 0 END) AS lost
       FROM leads
       GROUP BY source
       ORDER BY won DESC, total DESC`
    )
    .all() as Omit<SourceStat, "winRate">[];

  return rows.map((r) => ({
    ...r,
    winRate: r.total ? Math.round((r.won / r.total) * 100) : 0,
  }));
}
