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
