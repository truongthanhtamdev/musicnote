"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { officeCheckinAction } from "@/actions/office-checkin";

type Phase = "idle" | "starting" | "ready" | "sending" | "done";

/** Vị trí GPS hiện tại, độ chính xác cao. */
function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 0,
    })
  );
}

function explain(e: unknown, what: "camera" | "vị trí"): string {
  const name = (e as { name?: string; code?: number })?.name;
  const code = (e as { code?: number })?.code;
  if (name === "NotAllowedError" || code === 1) {
    return `Trình duyệt đang chặn ${what}. Bấm biểu tượng ổ khoá cạnh địa chỉ web → cho phép Camera và Vị trí, rồi tải lại trang.`;
  }
  if (name === "NotFoundError") return "Không tìm thấy camera trên máy này.";
  if (code === 3) return "Lấy vị trí quá lâu — ra chỗ thoáng hoặc bật Định vị (GPS) rồi thử lại.";
  return `Không mở được ${what}. Thử tải lại trang, hoặc mở bằng Chrome / Safari.`;
}

/**
 * Chấm công bằng ảnh chụp + vị trí: mở camera trước, bấm một nút là chụp
 * ảnh, lấy GPS và gửi lên. Ảnh thu nhỏ còn ~480px để gửi nhanh trên 4G.
 */
export default function CheckinCamera({ disabledReason }: { disabledReason?: string | null }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  useEffect(() => stop, []);

  async function start() {
    setError(null);
    setOk(null);
    setPreview(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Trang phải mở bằng https:// thì mới dùng được camera.");
      return;
    }
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPhase("ready");
      // Hỏi quyền vị trí luôn lúc này, để lúc bấm chấm công khỏi chờ thêm.
      getPosition().catch(() => {});
    } catch (e) {
      setPhase("idle");
      setError(explain(e, "camera"));
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setError(null);
    setPhase("sending");
    const w = 480;
    const h = Math.round((video.videoHeight / video.videoWidth) * w);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
    const photo = canvas.toDataURL("image/jpeg", 0.72);
    setPreview(photo);

    let pos: GeolocationPosition;
    try {
      pos = await getPosition();
    } catch (e) {
      setPhase("ready");
      setPreview(null);
      setError(explain(e, "vị trí"));
      return;
    }
    try {
      const res = await officeCheckinAction({
        photo,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      if (res.error) {
        setPhase("ready");
        setPreview(null);
        setError(res.error);
        return;
      }
      stop();
      setPhase("done");
      setOk(res.ok ?? "Đã chấm công");
      router.refresh();
    } catch {
      setPhase("ready");
      setPreview(null);
      setError("Mạng chập chờn — chưa gửi được, bấm chụp lại giúp mình.");
    }
  }

  if (disabledReason && phase !== "done") {
    return <p className="rounded-xl bg-ivory-100 px-4 py-3 text-sm text-ink-600">{disabledReason}</p>;
  }

  return (
    <div className="space-y-3">
      {(phase === "ready" || phase === "sending" || phase === "starting") && (
        <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-navy-950">
          {/* Khung camera luôn giữ nguyên; ảnh vừa chụp phủ lên trên. Thay hẳn khung
              camera bằng ảnh thì camera mất kết nối — bị từ chối xong chụp lại sẽ ra màn đen. */}
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover -scale-x-100" />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Ảnh vừa chụp" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {phase === "sending" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white">
              Đang lấy vị trí và gửi…
            </div>
          )}
        </div>
      )}

      {phase === "idle" && (
        <button
          type="button"
          onClick={start}
          className="w-full rounded-2xl bg-wood-500 hover:bg-wood-600 px-6 py-4 text-lg font-bold text-white shadow"
        >
          📷 Mở camera để chấm công
        </button>
      )}
      {phase === "starting" && <p className="text-center text-sm text-ink-500">Đang mở camera…</p>}
      {phase === "ready" && (
        <button
          type="button"
          onClick={capture}
          className="w-full rounded-2xl bg-mint-600 hover:bg-mint-700 px-6 py-4 text-lg font-bold text-white shadow"
        >
          ✅ Chụp ảnh &amp; chấm công
        </button>
      )}
      {phase === "done" && ok && (
        <div className="rounded-2xl border border-mint-200 bg-mint-50 px-4 py-4 text-center">
          <p className="text-3xl">✅</p>
          <p className="mt-1 font-semibold text-mint-700">{ok}</p>
        </div>
      )}
      {error && <p className="rounded-xl bg-coral-50 border border-coral-100 px-4 py-3 text-sm text-coral-700">{error}</p>}
      {phase !== "done" && (
        <p className="text-xs text-ink-400 text-center">
          Web cần quyền <b>Camera</b> và <b>Vị trí</b>. Ảnh và vị trí chỉ quản lý trung tâm xem được.
        </p>
      )}
    </div>
  );
}
