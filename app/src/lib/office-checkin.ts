import fs from "node:fs";
import path from "node:path";
import { db, DATA_DIR } from "./db";
import { getSetting, setSetting } from "./queries";
import { localFromSqlUtc } from "./format";

/**
 * Chấm công văn phòng: nhân viên bấm chấm công trên điện thoại, web chụp ảnh
 * từ camera và lấy vị trí GPS. Mỗi lần chấm công tính một số giờ cố định
 * (mặc định 4 tiếng) × tiền mỗi giờ của người đó.
 */

/** Mặc định cho nhân viên đặt hẹn / thực tập sinh: 25.000đ/giờ, 4 giờ một lần. */
export const DEFAULT_COORDINATOR_RATE = 25_000;
export const DEFAULT_HOURS_PER_CHECKIN = 4;
/** Bán kính mặc định quanh văn phòng được tính là "đang ở văn phòng". */
export const DEFAULT_OFFICE_RADIUS_M = 150;
/** Ảnh gửi lên tối đa (base64 JPEG đã thu nhỏ trên điện thoại). */
export const MAX_PHOTO_BYTES = 600_000;

export const OFFICE_ROLES = ["coordinator", "manager"] as const;

const PHOTO_DIR = path.join(DATA_DIR, "office-photos");

export interface OfficeLocation {
  lat: number;
  lng: number;
  radius: number;
}

export function getOfficeLocation(): OfficeLocation | null {
  const lat = Number(getSetting("office_lat"));
  const lng = Number(getSetting("office_lng"));
  if (!getSetting("office_lat") || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  const radius = Number(getSetting("office_radius_m")) || DEFAULT_OFFICE_RADIUS_M;
  return { lat, lng, radius };
}

export function setOfficeLocation(loc: OfficeLocation) {
  setSetting("office_lat", String(loc.lat));
  setSetting("office_lng", String(loc.lng));
  setSetting("office_radius_m", String(Math.round(loc.radius)));
}

/** Khoảng cách (mét) giữa hai toạ độ — công thức haversine. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface OfficePay {
  /** Tiền một ca (một lần chấm công). */
  shiftPay: number;
  /** Số giờ tính cho một ca. */
  hours: number;
  /** Quy ra tiền mỗi giờ, chỉ để tham khảo. */
  rate: number;
  /** Mức đang dùng là mặc định theo vai trò (chưa ai chỉnh riêng). */
  isDefault: boolean;
}

/**
 * Lương chấm công của một người. Ưu tiên "lương 1 ca" chủ trung tâm gõ
 * thẳng; chưa gõ thì tiền mỗi giờ × số giờ (mặc định thực tập sinh 25.000đ
 * × 4 giờ = 100.000đ một ca).
 */
export function officePayFor(user: {
  role: string;
  office_hourly_rate?: number | null;
  office_hours_per_checkin?: number | null;
  office_shift_pay?: number | null;
}): OfficePay {
  const defaultRate = user.role === "coordinator" ? DEFAULT_COORDINATOR_RATE : 0;
  const hours = user.office_hours_per_checkin ?? DEFAULT_HOURS_PER_CHECKIN;
  const shiftPay = user.office_shift_pay ?? Math.round((user.office_hourly_rate ?? defaultRate) * hours);
  return {
    shiftPay,
    hours,
    rate: hours > 0 ? Math.round(shiftPay / hours) : 0,
    isDefault: user.office_shift_pay == null && user.office_hourly_rate == null && user.office_hours_per_checkin == null,
  };
}

export interface OfficeCheckinRow {
  id: number;
  user_id: number;
  user_name: string;
  work_date: string;
  checked_at: string;
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  distance_m: number | null;
  photo: string | null;
  hours: number;
  amount: number;
  voided: number;
  void_reason: string | null;
}

export function listOfficeCheckins(opts: { from: string; to: string; userId?: number }): OfficeCheckinRow[] {
  return db
    .prepare(
      `SELECT o.*, u.name AS user_name FROM office_checkins o JOIN users u ON u.id = o.user_id
        WHERE o.work_date BETWEEN ? AND ? ${opts.userId ? "AND o.user_id = ?" : ""}
        ORDER BY o.checked_at DESC, o.id DESC`
    )
    .all(...[opts.from, opts.to, ...(opts.userId ? [opts.userId] : [])]) as OfficeCheckinRow[];
}

export interface OfficeSummary {
  userId: number;
  name: string;
  role: string;
  count: number;
  days: number;
  hours: number;
  amount: number;
  pay: OfficePay;
}

/** Bảng công văn phòng trong kỳ: mọi nhân viên văn phòng đang làm, kể cả chưa chấm lần nào. */
export function officeSummary(from: string, to: string): OfficeSummary[] {
  const staff = db
    .prepare(
      `SELECT id, name, role, office_hourly_rate, office_hours_per_checkin, office_shift_pay FROM users
        WHERE role IN ('coordinator','manager') AND active = 1 ORDER BY role DESC, name`
    )
    .all() as {
    id: number;
    name: string;
    role: string;
    office_hourly_rate: number | null;
    office_hours_per_checkin: number | null;
    office_shift_pay: number | null;
  }[];
  const agg = new Map(
    (
      db
        .prepare(
          `SELECT user_id, COUNT(*) AS count, COUNT(DISTINCT work_date) AS days, SUM(hours) AS hours, SUM(amount) AS amount
             FROM office_checkins WHERE voided = 0 AND work_date BETWEEN ? AND ? GROUP BY user_id`
        )
        .all(from, to) as { user_id: number; count: number; days: number; hours: number; amount: number }[]
    ).map((r) => [r.user_id, r])
  );
  return staff.map((u) => {
    const a = agg.get(u.id);
    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      count: a?.count ?? 0,
      days: a?.days ?? 0,
      hours: a?.hours ?? 0,
      amount: a?.amount ?? 0,
      pay: officePayFor(u),
    };
  });
}

/** Tổng tiền chấm công (không tính lần đã huỷ) của một người trong kỳ. */
export function officeEarnings(userId: number, from: string, to: string): { count: number; hours: number; amount: number } {
  const r = db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(hours), 0) AS hours, COALESCE(SUM(amount), 0) AS amount
         FROM office_checkins WHERE voided = 0 AND user_id = ? AND work_date BETWEEN ? AND ?`
    )
    .get(userId, from, to) as { count: number; hours: number; amount: number };
  return r;
}

/** Lần chấm công gần nhất còn hiệu lực — để chặn chấm trùng trong cùng một ca. */
export function lastValidCheckin(userId: number): { checked_at: string; hours: number } | undefined {
  return db
    .prepare("SELECT checked_at, hours FROM office_checkins WHERE user_id = ? AND voided = 0 ORDER BY checked_at DESC LIMIT 1")
    .get(userId) as { checked_at: string; hours: number } | undefined;
}

/** Lưu ảnh JPEG (data URL) ra tệp, trả về tên tệp. */
export function saveCheckinPhoto(id: number, dataUrl: string): string | null {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const buf = Buffer.from(m[1], "base64");
  // JPEG bắt đầu bằng FF D8 — không nhận thứ gì khác giả làm ảnh.
  if (buf.length < 100 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  const name = `${id}.jpg`;
  fs.writeFileSync(path.join(PHOTO_DIR, name), buf);
  return name;
}

export function readCheckinPhoto(name: string): Buffer | null {
  if (!/^\d+\.jpg$/.test(name)) return null;
  const file = path.join(PHOTO_DIR, name);
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

/** Đang trong ca vừa chấm: trả "HH:MM–HH:MM" (giờ Việt Nam), hết ca thì null. */
export function currentShift(userId: number): { start: string; end: string } | null {
  const last = lastValidCheckin(userId);
  if (!last) return null;
  const startMs = new Date(`${last.checked_at.replace(" ", "T")}Z`).getTime();
  const endMs = startMs + last.hours * 3600_000;
  if (Date.now() >= endMs) return null;
  const toLocal = (ms: number) => localFromSqlUtc(new Date(ms).toISOString().slice(0, 19).replace("T", " ")).slice(11, 16);
  return { start: toLocal(startMs), end: toLocal(endMs) };
}
