"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconX } from "./icons";

/**
 * Modal dùng chung: trên mobile trượt lên từ đáy (bottom sheet), trên desktop
 * là hộp thoại giữa màn hình. Đóng bằng nút X, nền mờ hoặc phím Esc.
 *
 * Chiều cao tính theo dvh chứ không phải vh: bàn phím điện thoại mở ra làm
 * khung nhìn thấp đi, dùng vh thì đáy hộp thoại (có nút Lưu) chui xuống dưới
 * bàn phím. Và chỉ đóng khi cả lúc đặt ngón lẫn lúc nhấc ngón đều ở nền mờ —
 * bàn phím mở/đóng làm hộp thoại xê dịch, bấm hụt sang nền một cái là bao
 * nhiêu thứ vừa gõ mất sạch.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  // Ngón tay đặt xuống ở đâu: chỉ nền mờ mới được đóng hộp thoại.
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Đóng"
        onPointerDown={(e) => {
          pressedBackdrop.current = e.currentTarget === e.target;
        }}
        onClick={() => {
          if (pressedBackdrop.current) onClose();
          pressedBackdrop.current = false;
        }}
        className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"
        } max-h-[92dvh] sm:max-h-[88dvh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-navy-100`}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-navy-100">
          <div className="min-w-0">
            <h2 className="font-bold text-lg text-ink-900 leading-tight">{title}</h2>
            {subtitle && <div className="text-sm text-ink-500 mt-0.5">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 -mr-1.5 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-ivory-100 transition"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto scroll-thin px-5 py-4 flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-navy-100 bg-ivory-50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
