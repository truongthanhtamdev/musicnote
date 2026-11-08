"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";
import { getUserById } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { formatVND, localFromSqlUtc, todayISO } from "@/lib/format";
import { MANAGE_ROLES } from "@/lib/types";
import {
  MAX_PHOTO_BYTES,
  OFFICE_ROLES,
  distanceMeters,
  getOfficeLocation,
  lastValidCheckin,
  officePayFor,
  saveCheckinPhoto,
  setOfficeLocation,
} from "@/lib/office-checkin";

export interface CheckinResult {
  error?: string;
  ok?: string;
}

function revalidateOffice() {
  revalidatePath("/admin/cham-cong");
  revalidatePath("/admin/cong-van-phong");
  revalidatePath("/admin/thu-nhap");
}

/**
 * Chấm công: bắt buộc có ảnh chụp từ camera và vị trí GPS. Đã khai vị trí văn
 * phòng thì phải đứng trong bán kính cho phép. Giờ chấm lấy theo đồng hồ máy
 * chủ, không tin giờ trên điện thoại.
 */
export async function officeCheckinAction(input: {
  photo: string;
  lat: number;
  lng: number;
  accuracy: number;
}): Promise<CheckinResult> {
  const session = await assertRole([...OFFICE_ROLES]);
  const user = getUserById(session.userId);
  if (!user) return { error: "Không tìm thấy tài khoản" };

  if (typeof input.photo !== "string" || !input.photo.startsWith("data:image/jpeg")) {
    return { error: "Chưa có ảnh chụp — bấm cho phép dùng camera rồi chụp lại." };
  }
  if (input.photo.length > MAX_PHOTO_BYTES * 1.4) return { error: "Ảnh quá lớn, chụp lại giúp mình nhé." };
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const accuracy = Math.max(0, Number(input.accuracy) || 0);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { error: "Chưa lấy được vị trí — bật Định vị (GPS) và cho phép trình duyệt dùng vị trí." };
  }

  const office = getOfficeLocation();
  let distance: number | null = null;
  if (office) {
    distance = Math.round(distanceMeters({ lat, lng }, office));
    // GPS điện thoại sai số vài chục mét: trừ hao tối đa 100m theo độ chính xác máy báo.
    const tolerance = Math.min(accuracy, 100);
    if (distance - tolerance > office.radius) {
      return {
        error: `Bạn đang cách văn phòng khoảng ${distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`} — chỉ chấm công được khi ở văn phòng.`,
      };
    }
  }

  const pay = officePayFor(user);
  const last = lastValidCheckin(user.id);
  if (last) {
    const lastAt = new Date(`${last.checked_at.replace(" ", "T")}Z`).getTime();
    const shiftEnds = lastAt + last.hours * 3600_000;
    if (Date.now() < shiftEnds) {
      return {
        error: `Bạn đã chấm công lúc ${localFromSqlUtc(last.checked_at).slice(11, 16)} — ca ${last.hours} tiếng chưa hết, chưa chấm lần mới được.`,
      };
    }
  }

  const amount = pay.shiftPay;
  const id = Number(
    db
      .prepare(
        `INSERT INTO office_checkins (user_id, work_date, lat, lng, accuracy_m, distance_m, hours, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(user.id, todayISO(), lat, lng, accuracy, distance, pay.hours, amount).lastInsertRowid
  );
  const photo = saveCheckinPhoto(id, input.photo);
  if (!photo) {
    db.prepare("DELETE FROM office_checkins WHERE id = ?").run(id);
    return { error: "Ảnh không hợp lệ, chụp lại giúp mình nhé." };
  }
  db.prepare("UPDATE office_checkins SET photo = ? WHERE id = ?").run(photo, id);

  revalidateOffice();
  return {
    ok: `Đã chấm công ${pay.hours} tiếng${amount > 0 ? ` · ${formatVND(amount)}` : ""}${
      office ? "" : " (văn phòng chưa khai vị trí — đã lưu vị trí của bạn để quản lý xem)"
    }.`,
  };
}

/** Huỷ / khôi phục một lần chấm công (chấm hộ, ảnh không đúng người…). */
export async function setOfficeCheckinVoidAction(id: number, voided: boolean, reason?: string): Promise<CheckinResult> {
  const session = await assertRole(MANAGE_ROLES);
  const row = db
    .prepare("SELECT o.work_date, u.name FROM office_checkins o JOIN users u ON u.id = o.user_id WHERE o.id = ?")
    .get(id) as { work_date: string; name: string } | undefined;
  if (!row) return { error: "Không tìm thấy lần chấm công" };
  db.prepare("UPDATE office_checkins SET voided = ?, void_reason = ? WHERE id = ?").run(
    voided ? 1 : 0,
    voided ? (reason || "").trim().slice(0, 200) || null : null,
    id
  );
  logAudit(
    session,
    "luong",
    `${voided ? "Huỷ" : "Khôi phục"} chấm công ${row.name} ngày ${row.work_date.split("-").reverse().join("/")}${
      voided && reason ? ` — ${reason}` : ""
    }`
  );
  revalidateOffice();
  return { ok: voided ? "Đã huỷ lần chấm công" : "Đã khôi phục" };
}

/** Đặt vị trí văn phòng (thường là bấm "lấy vị trí hiện tại" khi đang ở văn phòng). */
export async function setOfficeLocationAction(lat: number, lng: number, radius: number): Promise<CheckinResult> {
  const session = await assertRole(MANAGE_ROLES);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { error: "Vị trí không hợp lệ" };
  }
  const r = Math.min(2000, Math.max(30, Math.round(Number(radius) || 150)));
  setOfficeLocation({ lat, lng, radius: r });
  logAudit(session, "he_thong", `Đặt vị trí văn phòng chấm công (bán kính ${r} m)`);
  revalidateOffice();
  return { ok: `Đã lưu vị trí văn phòng, bán kính ${r} m.` };
}

/**
 * Lương 1 ca của một người (tiền mỗi lần chấm công) + số giờ một ca. Áp cho
 * các lần chấm công từ giờ trở đi; ca đã chấm giữ nguyên (sửa riêng từng ca
 * bằng setOfficeCheckinAmountAction).
 */
export async function setOfficePayAction(userId: number, shiftPay: number, hours: number): Promise<CheckinResult> {
  const session = await assertRole(MANAGE_ROLES);
  const target = getUserById(userId);
  if (!target || !(OFFICE_ROLES as readonly string[]).includes(target.role)) {
    return { error: "Chỉ đặt cho nhân viên văn phòng" };
  }
  if (!Number.isFinite(shiftPay) || shiftPay < 0 || shiftPay > 10_000_000) return { error: "Lương 1 ca không hợp lệ" };
  if (!Number.isFinite(hours) || hours < 0.5 || hours > 24) return { error: "Số giờ 1 ca phải từ 0,5 đến 24" };
  const pay = Math.round(shiftPay);
  db.prepare("UPDATE users SET office_shift_pay = ?, office_hours_per_checkin = ? WHERE id = ?").run(pay, hours, userId);
  logAudit(session, "luong", `Lương chấm công ${target.name}: ${formatVND(pay)}/ca (${hours} giờ/ca)`);
  revalidateOffice();
  return { ok: "Đã lưu" };
}

/** Sửa tiền của một ca đã chấm (VD: về sớm, làm thêm giờ). */
export async function setOfficeCheckinAmountAction(id: number, amount: number, hours: number): Promise<CheckinResult> {
  const session = await assertRole(MANAGE_ROLES);
  const row = db
    .prepare("SELECT o.work_date, o.amount, o.hours, u.name FROM office_checkins o JOIN users u ON u.id = o.user_id WHERE o.id = ?")
    .get(id) as { work_date: string; amount: number; hours: number; name: string } | undefined;
  if (!row) return { error: "Không tìm thấy ca chấm công" };
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) return { error: "Số tiền không hợp lệ" };
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) return { error: "Số giờ không hợp lệ" };
  db.prepare("UPDATE office_checkins SET amount = ?, hours = ? WHERE id = ?").run(Math.round(amount), hours, id);
  logAudit(
    session,
    "luong",
    `Sửa ca chấm công ${row.name} ngày ${row.work_date.split("-").reverse().join("/")}: ${formatVND(row.amount)} (${row.hours} giờ) → ${formatVND(Math.round(amount))} (${hours} giờ)`
  );
  revalidateOffice();
  return { ok: "Đã sửa" };
}
