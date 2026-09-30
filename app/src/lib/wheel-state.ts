import { db } from "./db";
import { segmentIndexFor, spinWheel } from "./wheel";

/**
 * Trạng thái vòng quay của một đăng ký học thử, và lượt quay gắn vào nó.
 *
 * Luật: gửi đăng ký xong mới được quay, mỗi số điện thoại một lượt. Gửi lại
 * lần nữa bằng cùng số thì đăng ký mới nhận lại đúng số buổi đã trúng lần
 * trước, không được quay thêm — không thì cứ gửi form lại tới khi ra 3 buổi.
 */

/** 9 số cuối: "0901 234 567", "+84901234567" và "84901234567" là cùng một khách. */
function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "").slice(-9);
}

interface RequestRow {
  id: number;
  phone: string;
  wheel_prize: number | null;
}

function getRequest(id: number): RequestRow | undefined {
  return db.prepare("SELECT id, phone, wheel_prize FROM trial_requests WHERE id = ?").get(id) as
    | RequestRow
    | undefined;
}

/** Lượt quay trước đó của cùng số điện thoại, nếu có. */
function previousPrizeForPhone(req: RequestRow): number | null {
  const key = phoneKey(req.phone);
  if (key.length < 8) return null;
  const rows = db
    .prepare("SELECT phone, wheel_prize FROM trial_requests WHERE wheel_prize IS NOT NULL AND id != ?")
    .all(req.id) as { phone: string; wheel_prize: number }[];
  return rows.find((r) => phoneKey(r.phone) === key)?.wheel_prize ?? null;
}

export interface WheelState {
  /** Đã gửi đăng ký nên được quay (hoặc đã quay rồi). */
  unlocked: boolean;
  /** Số buổi đã trúng; null là chưa quay. */
  prize: number | null;
}

export function wheelStateFor(requestId: number | null): WheelState {
  const req = requestId ? getRequest(requestId) : undefined;
  if (!req) return { unlocked: false, prize: null };
  return { unlocked: true, prize: req.wheel_prize ?? null };
}

export interface SpinOutcome {
  index: number;
  sessions: number;
  alreadySpun: boolean;
}

/** Quay cho đúng đăng ký này. Đã quay rồi thì trả lại kết quả cũ, không quay lại. */
export function spinForRequest(requestId: number): SpinOutcome | null {
  const req = getRequest(requestId);
  if (!req) return null;
  if (req.wheel_prize) {
    return { index: segmentIndexFor(req.wheel_prize), sessions: req.wheel_prize, alreadySpun: true };
  }

  const earlier = previousPrizeForPhone(req);
  const outcome = earlier
    ? { index: segmentIndexFor(earlier), sessions: earlier, alreadySpun: true }
    : { ...spinWheel(), alreadySpun: false };

  // Điều kiện wheel_prize IS NULL: hai lần bấm dồn dập thì chỉ lần đầu được ghi.
  const changed = db
    .prepare(
      "UPDATE trial_requests SET wheel_prize = ?, trial_sessions = ? WHERE id = ? AND wheel_prize IS NULL"
    )
    .run(outcome.sessions, outcome.sessions, req.id).changes;
  if (changed === 0) {
    const now = getRequest(req.id)?.wheel_prize;
    if (now) return { index: segmentIndexFor(now), sessions: now, alreadySpun: true };
  }
  return outcome;
}
