"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  applyUiPref,
  UI_COLOR_KEY,
  UI_COLORS,
  UI_SIZE_KEY,
  UI_SIZES,
} from "@/lib/ui-prefs";
import { Modal } from "./modal";

function readAttr(attr: string): string {
  return typeof document === "undefined"
    ? ""
    : (document.documentElement.getAttribute(attr) ?? "");
}

const SWATCH: Record<string, string> = {
  "": "bg-[#faf9f6] text-[#64748b]",
  ro: "bg-white text-[#1e293b] font-bold",
  diu: "bg-[#f1ead9] text-[#55657a]",
};

/** Nút "Giao diện": chọn kiểu màu và cỡ chữ cho dễ nhìn — chỉ áp trên máy này. */
export function DisplaySettings({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");

  function show() {
    setColor(readAttr("data-ui-color"));
    setSize(readAttr("data-ui-size"));
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        title="Giao diện dễ nhìn"
        aria-label="Giao diện dễ nhìn"
        className={className}
      >
        <span className="text-[13px] font-bold leading-none" aria-hidden>
          Aa
        </span>
      </button>
      {/* Đưa hộp thoại ra thẳng <body>: nút này nằm trong thanh đầu trang (sticky,
          z-30) nên nếu để tại chỗ, menu dưới cùng sẽ đè lên mất nút "Xong". */}
      {open &&
        createPortal(
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Giao diện dễ nhìn"
            subtitle="Chọn màu và cỡ chữ hợp mắt bạn. Chỉ đổi trên máy / điện thoại này, không ảnh hưởng người khác."
          >
            <div className="space-y-5">
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-ink-900 mb-2">
                  Màu
                </legend>
                {UI_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      setColor(c.value);
                      applyUiPref("data-ui-color", UI_COLOR_KEY, c.value);
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      color === c.value
                        ? "border-wood-500 ring-2 ring-wood-200"
                        : "border-navy-200 hover:border-navy-300"
                    }`}
                  >
                    <span
                      className={`shrink-0 w-12 h-9 rounded-lg border border-black/10 flex items-center justify-center text-sm ${SWATCH[c.value]}`}
                    >
                      Aa
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink-900">
                        {c.label}
                      </span>
                      <span className="block text-xs text-ink-500">
                        {c.hint}
                      </span>
                    </span>
                  </button>
                ))}
              </fieldset>

              <fieldset>
                <legend className="text-sm font-semibold text-ink-900 mb-2">
                  Cỡ chữ
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {UI_SIZES.map((s, i) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        setSize(s.value);
                        applyUiPref("data-ui-size", UI_SIZE_KEY, s.value);
                      }}
                      className={`rounded-xl border py-2.5 font-semibold transition ${
                        size === s.value
                          ? "border-wood-500 bg-wood-50 text-wood-700"
                          : "border-navy-200 text-ink-700 hover:border-navy-300"
                      }`}
                      style={{ fontSize: `${14 + i * 2}px` }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-wood-500 hover:bg-wood-600 py-2.5 font-semibold text-white"
              >
                Xong
              </button>
            </div>
          </Modal>,
          document.body,
        )}
    </>
  );
}
