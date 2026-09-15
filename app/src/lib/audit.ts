import { db } from "./db";
import type { SessionPayload } from "./auth";

/** Nhóm việc, để lọc nhanh trong trang Nhật ký. */
export type AuditArea = "diem_danh" | "hoc_phi" | "luong" | "lop_hoc" | "tai_khoan" | "he_thong";

export const AUDIT_AREA_LABELS: Record<AuditArea, string> = {
  diem_danh: "Điểm danh",
  hoc_phi: "Học phí",
  luong: "Lương",
  lop_hoc: "Lớp học",
  tai_khoan: "Tài khoản",
  he_thong: "Hệ thống",
};

export interface AuditRow {
  id: number;
  user_id: number | null;
  user_name: string;
  role: string;
  area: AuditArea;
  summary: string;
  created_at: string;
}

/**
 * Ghi một dòng nhật ký. Gọi sau khi thao tác đã thành công.
 *
 * Bọc try/catch vì nhật ký là thứ phụ: ghi hỏng thì thôi, chứ để nó ném lỗi
 * làm hỏng luôn việc thu tiền hay điểm danh vừa làm xong là vô lý.
 */
export function logAudit(
  session: SessionPayload,
  area: AuditArea,
  summary: string
) {
  try {
    db.prepare(
      "INSERT INTO audit_log (user_id, user_name, role, area, summary) VALUES (?, ?, ?, ?, ?)"
    ).run(session.userId, session.name, session.role, area, summary.slice(0, 500));
  } catch (e) {
    console.error("[nhat-ky] không ghi được:", e);
  }
}

export function listAudit(opts: { area?: AuditArea; q?: string; limit?: number } = {}): AuditRow[] {
  const clauses: string[] = [];
  if (opts.area) clauses.push("area = @area");
  if (opts.q) clauses.push("(summary LIKE @like OR user_name LIKE @like)");
  return db
    .prepare(
      `SELECT * FROM audit_log
       ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
       ORDER BY id DESC LIMIT @limit`
    )
    .all({
      area: opts.area ?? null,
      like: opts.q ? `%${opts.q}%` : null,
      limit: opts.limit ?? 300,
    }) as AuditRow[];
}
