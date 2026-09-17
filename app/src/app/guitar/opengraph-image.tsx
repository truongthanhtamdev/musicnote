import { ImageResponse } from "next/og";
import { CHORD_BY_NAME } from "@/lib/guitar";

export const alt = "Thư viện hợp âm và vòng hòa thanh guitar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Vẽ lại một thế bấm bằng div để ảnh xem trước cho thấy đúng thứ trang này có. */
function MiniChord({ name }: { name: string }) {
  const chord = CHORD_BY_NAME.get(name);
  if (!chord) return null;
  const base = chord.baseFret ?? 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#fff" }}>{chord.name}</div>
      <div
        style={{
          position: "relative",
          display: "flex",
          width: 150,
          height: 180,
          background: "#fff",
          borderRadius: 10,
        }}
      >
        {/* dây dọc */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={`s${i}`}
            style={{
              position: "absolute",
              left: 20 + i * 22,
              top: 22,
              width: 2,
              height: 140,
              background: "#94a3b8",
            }}
          />
        ))}
        {/* ngăn ngang */}
        {[0, 1, 2, 3, 4, 5].map((f) => (
          <div
            key={`f${f}`}
            style={{
              position: "absolute",
              left: 20,
              top: 22 + f * 28,
              width: 112,
              height: f === 0 && base === 1 ? 5 : 2,
              background: f === 0 && base === 1 ? "#0f2038" : "#cbd5e1",
            }}
          />
        ))}
        {/* ngón bấm */}
        {chord.frets.map((fret, i) =>
          fret > 0 ? (
            <div
              key={`d${i}`}
              style={{
                position: "absolute",
                left: 20 + i * 22 - 10,
                top: 22 + (fret - base) * 28 + 5,
                width: 20,
                height: 20,
                borderRadius: 10,
                background: "#b06a2c",
              }}
            />
          ) : null
        )}
      </div>
    </div>
  );
}

export default function GuitarOgImage() {
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
          gap: 56,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#d9a56a" }}>
            Piano Guitar Đệm Hát · miễn phí
          </div>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.15,
              marginTop: 20,
              letterSpacing: -1.5,
            }}
          >
            Thư viện hợp âm &amp; vòng hòa thanh
          </div>
          <div style={{ fontSize: 28, color: "#a9bdd6", marginTop: 22, lineHeight: 1.45 }}>
            33 thế bấm có số ngón, 9 vòng hòa thanh đổi được theo 10 tông — cho người mới tập đệm
            hát.
          </div>
        </div>

        <div style={{ display: "flex", gap: 22 }}>
          <MiniChord name="C" />
          <MiniChord name="Am" />
          <MiniChord name="G" />
        </div>
      </div>
    ),
    size
  );
}
