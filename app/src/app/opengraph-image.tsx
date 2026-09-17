import { ImageResponse } from "next/og";

export const alt = "Piano Guitar Đệm Hát — học nhạc 1 kèm 1 online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Ảnh xem trước khi dán link trang chủ vào Zalo/Facebook.
 *
 * Vẽ bằng code thay vì thiết kế ảnh tay: sửa chữ là xong, không phải mở
 * Photoshop, và không lo quên cập nhật ảnh khi đổi nội dung.
 */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0f2038",
          color: "#fff",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: "#c78b4a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            ♪
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
            Piano Guitar Đệm Hát
          </div>
        </div>

        {/* Satori (bộ vẽ ảnh) bắt mọi thẻ có từ hai con trở lên phải khai
            display, nên mỗi dòng chữ là một div riêng thay vì dùng <br />. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 66,
            fontWeight: 700,
            lineHeight: 1.15,
            marginTop: 40,
            letterSpacing: -1.5,
          }}
        >
          <div>Học 1 kèm 1 online,</div>
          <div>giáo viên song ngữ Việt–Anh</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 30,
            color: "#a9bdd6",
            marginTop: 26,
            lineHeight: 1.4,
          }}
        >
          <div>Guitar · Piano · Violin · Saxophone · Thanh nhạc</div>
          <div>Toán · Tiếng Việt · Tiếng Anh</div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 28,
            fontWeight: 700,
            color: "#0f2038",
            background: "#e7674a",
            padding: "14px 28px",
            borderRadius: 14,
            alignSelf: "flex-start",
          }}
        >
          Học thử 1 buổi miễn phí
        </div>
      </div>
    ),
    size
  );
}
