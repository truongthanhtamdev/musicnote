import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAME,
  sessionCookieOptions,
  shouldRenew,
  signSession,
  verifySession,
} from "@/lib/session-token";

/**
 * Chạy trước mọi request vào khu đã đăng nhập. Làm hai việc:
 *
 *  1. Chưa đăng nhập (hoặc phiên hỏng/hết hạn) thì đưa về trang đăng nhập.
 *  2. GIA HẠN phiên cho người đang dùng.
 *
 * Việc thứ hai là để sửa lỗi "đang dùng thì bất chợt bị đá ra": phiên cấp 30
 * ngày và trước đây không bao giờ được gia hạn, nên người dùng hằng ngày vẫn
 * bị đăng xuất đúng ngày thứ 30. Giờ cứ dùng đều là phiên tự nối dài; nghỉ
 * hẳn 30 ngày mới phải đăng nhập lại.
 *
 * Từ Next 16, proxy chạy trên Node.js chứ không phải Edge, nên kiểm tra được
 * chữ ký ngay tại đây thay vì chỉ ngó xem có cookie hay không.
 *
 * Đây KHÔNG phải lớp bảo vệ duy nhất: quyền theo vai trò vẫn được kiểm tra
 * lại trong từng layout và từng server action.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/student");
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    // Nói rõ vì sao bị đưa về đây. Hai lý do này cần hai cách sửa khác hẳn
    // nhau, mà nhìn màn hình đăng nhập thì không tài nào phân biệt được:
    //   missing  — trình duyệt không gửi cookie (bị xoá, hoặc đang ở tên miền
    //              khác với lúc đăng nhập)
    //   invalid  — có cookie nhưng chữ ký sai hoặc đã hết hạn
    url.searchParams.set("reason", token ? "invalid" : "missing");
    const res = NextResponse.redirect(url);
    // Dọn cookie hỏng, không thì lần vào sau lại đi đúng vòng này.
    if (token) res.cookies.delete(COOKIE_NAME);
    return res;
  }

  const res = NextResponse.next();
  if (shouldRenew(session)) {
    res.cookies.set(COOKIE_NAME, signSession(session), sessionCookieOptions());
  }
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*"],
};
