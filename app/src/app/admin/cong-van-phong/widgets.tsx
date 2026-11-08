"use client";

import { useState, useTransition } from "react";
import {
  setOfficeCheckinAmountAction,
  setOfficeCheckinVoidAction,
  setOfficeLocationAction,
  setOfficePayAction,
} from "@/actions/office-checkin";
import { formatVND } from "@/lib/format";

/** Lương 1 ca của một người (tiền mỗi lần chấm công) và số giờ một ca. */
export function PayEditor({ userId, shiftPay, hours }: { userId: number; shiftPay: number; hours: number }) {
  const [p, setP] = useState(String(shiftPay));
  const [h, setH] = useState(String(hours));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = p !== String(shiftPay) || h !== String(hours);
  const perHour = (Number(h) || 0) > 0 ? Math.round((Number(p) || 0) / Number(h)) : 0;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <input
        value={p}
        onChange={(e) => setP(e.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        aria-label="Lương 1 ca"
        className="w-28 rounded-lg border border-navy-200 px-2 py-1 tabular"
      />
      <span className="text-ink-500">đ / ca</span>
      <input
        value={h}
        onChange={(e) => setH(e.target.value.replace(/[^\d.]/g, ""))}
        inputMode="decimal"
        aria-label="Số giờ 1 ca"
        className="w-14 rounded-lg border border-navy-200 px-2 py-1 tabular"
      />
      <span className="text-ink-500">giờ/ca (≈ {formatVND(perHour)}/giờ)</span>
      {dirty && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setOfficePayAction(userId, Number(p), Number(h));
              setMsg(res.error ?? "Đã lưu — áp cho các ca chấm từ giờ");
            })
          }
          className="rounded-lg bg-wood-500 px-2.5 py-1 text-xs font-semibold text-white"
        >
          Lưu
        </button>
      )}
      {msg && !dirty && <span className="text-xs text-mint-700">{msg}</span>}
    </div>
  );
}

/** Sửa tiền / số giờ của một ca đã chấm. */
export function ShiftAmountEditor({ id, amount, hours }: { id: number; amount: number; hours: number }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(String(amount));
  const [h, setH] = useState(String(hours));
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-wood-700 hover:underline">
        Sửa
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs">
      <input
        value={a}
        onChange={(e) => setA(e.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        aria-label="Tiền ca này"
        className="w-24 rounded-lg border border-navy-200 px-2 py-1 tabular"
      />
      đ
      <input
        value={h}
        onChange={(e) => setH(e.target.value.replace(/[^\d.]/g, ""))}
        inputMode="decimal"
        aria-label="Số giờ ca này"
        className="w-12 rounded-lg border border-navy-200 px-2 py-1 tabular"
      />
      giờ
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setOfficeCheckinAmountAction(id, Number(a), Number(h));
            if (res.error) setErr(res.error);
            else setOpen(false);
          })
        }
        className="rounded-lg bg-wood-500 px-2 py-1 font-semibold text-white"
      >
        Lưu
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-ink-500">
        Thôi
      </button>
      {err && <span className="text-coral-600">{err}</span>}
    </span>
  );
}

/** Lấy vị trí hiện tại (đứng ở văn phòng) làm vị trí chấm công. */
export function OfficeLocationForm({ radius }: { radius: number }) {
  const [rad, setRad] = useState(String(radius));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="text-ink-600">
          Bán kính cho phép{" "}
          <input
            value={rad}
            onChange={(e) => setRad(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="w-20 rounded-lg border border-navy-200 px-2 py-1 tabular"
          />{" "}
          m
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setMsg("Đang lấy vị trí…");
            navigator.geolocation.getCurrentPosition(
              (pos) =>
                start(async () => {
                  const res = await setOfficeLocationAction(pos.coords.latitude, pos.coords.longitude, Number(rad));
                  setMsg(res.error ?? res.ok ?? null);
                }),
              () => setMsg("Không lấy được vị trí — cho phép trình duyệt dùng Vị trí rồi thử lại."),
              { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 }
            );
          }}
          className="rounded-xl bg-navy-800 hover:bg-navy-700 px-3 py-2 text-sm font-semibold text-white"
        >
          📍 Lấy vị trí hiện tại làm văn phòng
        </button>
      </div>
      {msg && <p className="text-sm text-ink-600">{msg}</p>}
    </div>
  );
}

/** Huỷ / khôi phục một lần chấm công. */
export function VoidButton({ id, voided }: { id: number; voided: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (voided) {
          start(async () => void (await setOfficeCheckinVoidAction(id, false)));
          return;
        }
        const reason = window.prompt("Lý do huỷ lần chấm công này (VD: chấm hộ, ảnh không đúng người):");
        if (reason === null) return;
        start(async () => void (await setOfficeCheckinVoidAction(id, true, reason)));
      }}
      className={`text-xs font-semibold ${voided ? "text-mint-700" : "text-coral-600"} hover:underline disabled:opacity-60`}
    >
      {voided ? "Khôi phục" : "Huỷ"}
    </button>
  );
}
