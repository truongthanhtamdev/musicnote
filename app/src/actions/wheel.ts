"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { readRequest, WHEEL_REQUEST_COOKIE } from "@/lib/wheel";
import { spinForRequest, type SpinOutcome } from "@/lib/wheel-state";

export type SpinResult = SpinOutcome | { error: string };

/**
 * Quay một lượt cho đăng ký học thử vừa gửi từ máy này. Chưa gửi đăng ký thì
 * không quay được — mã đăng ký nằm trong cookie httpOnly do máy chủ ký, trang
 * web không tự chế ra được.
 */
export async function spinWheelAction(): Promise<SpinResult> {
  const store = await cookies();
  const requestId = readRequest(store.get(WHEEL_REQUEST_COOKIE)?.value);
  const result = requestId ? spinForRequest(requestId) : null;
  if (!result) return { error: "Bạn điền thông tin đăng ký học thử trước rồi mới quay được nhé." };
  revalidatePath("/admin/trial-requests");
  return result;
}
