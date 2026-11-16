"use client";

import { useState } from "react";
import { COUNTRIES, DIAL_CODES, QUICK_COUNTRIES } from "@/lib/types";

/**
 * Quốc gia + SĐT của khách trong form tạo lớp: bấm chọn nhanh Việt Nam / Úc /
 * Mỹ / Canada / Singapore hoặc "Nước khác" rồi gõ tên nước; ô SĐT hiện mã nước
 * tương ứng (lúc lưu tự thêm mã nếu khách nước ngoài gõ số kiểu trong nước).
 */
export function CountryPhoneField({
  required = false,
  defaultPhone,
  defaultCountry,
  className,
  labelClass,
  phoneName = "student_phone",
  idPrefix = "a",
  countryLabel = "Khách ở nước nào",
  phoneLabel = "SĐT khách hàng",
}: {
  required?: boolean;
  defaultPhone?: string;
  defaultCountry?: string | null;
  className: string;
  labelClass: string;
  phoneName?: string;
  idPrefix?: string;
  countryLabel?: string;
  phoneLabel?: string;
}) {
  const [country, setCountry] = useState(defaultCountry ?? "");
  const [other, setOther] = useState(!!defaultCountry && !QUICK_COUNTRIES.includes(defaultCountry));
  const code = DIAL_CODES[country];
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
      active ? "border-wood-500 bg-wood-500 text-white" : "border-navy-200 bg-white text-ink-700 hover:border-navy-300"
    }`;

  return (
    <div className="space-y-3">
      <div>
        <span className={labelClass}>
          {countryLabel}{required && <span className="text-coral-500"> *</span>}
        </span>
        <div className="flex flex-wrap gap-2">
          {QUICK_COUNTRIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCountry(c);
                setOther(false);
              }}
              className={chip(!other && country === c)}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setOther(true);
              setCountry("");
            }}
            className={chip(other)}
          >
            Nước khác…
          </button>
        </div>
        {other ? (
          <>
            <input
              name="country"
              list={`${idPrefix}-country-list`}
              required={required}
              autoFocus
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              maxLength={60}
              autoComplete="off"
              aria-label="Tên nước"
              placeholder="Gõ tên nước: Đức, Nhật Bản, Anh…"
              className={`${className} mt-2`}
            />
            <datalist id={`${idPrefix}-country-list`}>
              {COUNTRIES.filter((c) => !QUICK_COUNTRIES.includes(c)).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </>
        ) : (
          // Ô ẩn mang giá trị khi bấm nút chọn nhanh; "required" vẫn chặn khi chưa chọn nước nào.
          <input
            name="country"
            value={country}
            required={required}
            onChange={(e) => e.currentTarget.setCustomValidity("")}
            onInvalid={(e) => e.currentTarget.setCustomValidity("Chọn khách đang ở nước nào")}
            tabIndex={-1}
            aria-hidden
            className="sr-only"
          />
        )}
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-phone`}>
          {phoneLabel}{required && <span className="text-coral-500"> *</span>}
        </label>
        <div className="flex items-stretch gap-2">
          {code && (
            <span className="inline-flex shrink-0 items-center rounded-xl border border-navy-200 bg-ivory-50 px-3 text-sm font-semibold text-ink-700 tabular">
              {code}
            </span>
          )}
          <input
            id={`${idPrefix}-phone`}
            name={phoneName}
            type="tel"
            required={required}
            defaultValue={defaultPhone}
            maxLength={30}
            placeholder={country && country !== "Việt Nam" ? "Số điện thoại (Zalo / WhatsApp)" : "VD: 0901 234 567"}
            className={`${className} min-w-0 flex-1`}
          />
        </div>
      </div>
    </div>
  );
}
