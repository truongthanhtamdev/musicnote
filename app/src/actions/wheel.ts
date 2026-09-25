"use server";

import { cookies } from "next/headers";
import {
  readPrize,
  signPrize,
  spinWheel,
  WHEEL_COOKIE,
  WHEEL_COOKIE_DAYS,
  type WheelPrize,
} from "@/lib/wheel";

export interface SpinResult extends WheelPrize {
  /** Đã quay từ trước rồi: trả lại đúng kết quả cũ, không quay lại. */
  alreadySpun: boolean;
}

/**
 * Quay một lượt. Mỗi máy một lượt: đã có kết quả thì trả lại đúng kết quả đó
 * thay vì quay lại, nếu không thì bấm đi bấm lại là ra 5 buổi.
 *
 * Xoá cookie trình duyệt thì quay lại được — chấp nhận, vì đây là trò khuyến
 * mại chứ không phải cổng thanh toán, và giáo vụ vẫn nhìn thấy số buổi trên
 * từng đăng ký để đối chiếu.
 */
export async function spinWheelAction(): Promise<SpinResult> {
  const store = await cookies();

  const existing = readPrize(store.get(WHEEL_COOKIE)?.value);
  if (existing) return { ...existing, alreadySpun: true };

  const prize = spinWheel();
  store.set(WHEEL_COOKIE, signPrize(prize), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: WHEEL_COOKIE_DAYS * 24 * 60 * 60,
  });
  return { ...prize, alreadySpun: false };
}
