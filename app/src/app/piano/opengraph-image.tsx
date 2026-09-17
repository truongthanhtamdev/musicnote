import { ImageResponse } from "next/og";

export const alt = "Mẹo nhớ nốt khóa Sol, khóa Fa và game đọc nốt piano";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Khuông nhạc mini vẽ bằng div, cho ảnh xem trước thấy đúng thứ trang này dạy. */
function MiniStaff({ dots }: { dots: { top: number }[] }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: 300,
        height: 120,
        background: "#fff",
        borderRadius: 12,
      }}
    >
      {[0, 1, 2, 3, 4].map((l) => (
        <div
          key={l}
          style={{
            position: "absolute",
            left: 18,
            top: 30 + l * 15,
            width: 264,
            height: 2,
            background: "#334155",
          }}
        />
      ))}
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 90 + i * 60,
            top: d.top,
            width: 20,
            height: 16,
            borderRadius: 10,
            background: "#b06a2c",
          }}
        />
      ))}
    </div>
  );
}

export default function PianoOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0f2038",
          color: "#fff",
          padding: "64px 72px",
          fontFamily: "sans-serif",
          alignItems: "center",
          gap: 50,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#d9a56a" }}>
            Piano Guitar Đệm Hát · miễn phí
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 58,
              fontWeight: 700,
              lineHeight: 1.15,
              marginTop: 20,
              letterSpacing: -1.5,
            }}
          >
            <div>Mẹo nhớ nốt khóa Sol,</div>
            <div>khóa Fa + game đọc nốt</div>
          </div>
          <div style={{ fontSize: 27, color: "#a9bdd6", marginTop: 20, lineHeight: 1.45 }}>
            Đọc nốt là phản xạ, không phải trí nhớ — luyện mỗi ngày 5 phút.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <MiniStaff dots={[{ top: 52 }, { top: 37 }, { top: 67 }]} />
          <MiniStaff dots={[{ top: 45 }, { top: 75 }, { top: 60 }]} />
        </div>
      </div>
    ),
    size
  );
}
