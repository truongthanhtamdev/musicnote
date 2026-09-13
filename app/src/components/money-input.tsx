"use client";

import { useState, type InputHTMLAttributes } from "react";

/** "7500000" → "7.500.000". Giữ dấu trừ ở đầu cho ô cho phép số âm. */
export function groupThousands(raw: string): string {
  const negative = raw.trim().startsWith("-");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return negative ? "-" : "";
  return (negative ? "-" : "") + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Lấy lại số thuần từ những gì người dùng gõ, bỏ mọi dấu chấm/khoảng trắng. */
export function stripThousands(display: string, allowNegative: boolean): string {
  const negative = allowNegative && display.trim().startsWith("-");
  const digits = display.replace(/\D/g, "");
  if (!digits) return negative ? "-" : "";
  return (negative ? "-" : "") + digits;
}

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  name: string;
  /** Số thuần ban đầu (ô tự giữ trạng thái). */
  defaultValue?: string | number | null;
  /** Số thuần, khi trang ngoài cần đọc giá trị — dùng kèm onValueChange. */
  value?: string | number;
  onValueChange?: (raw: string) => void;
  /** Cho gõ số âm, dùng cho ô trừ tiền. */
  allowNegative?: boolean;
};

/**
 * Ô nhập tiền có dấu chấm ngăn hàng nghìn ngay khi gõ: 7500000 hiện thành
 * 7.500.000, khỏi phải đếm số 0 rồi nhầm mười lần tiền.
 *
 * Ô nhìn thấy là text (có dấu chấm) còn số thuần đi kèm trong một input ẩn
 * mang đúng `name`, nên server action vẫn nhận số như cũ — không phải sửa gì
 * ở phía xử lý. Dùng inputMode numeric để điện thoại bật bàn phím số.
 */
export function MoneyInput({
  name,
  defaultValue,
  value,
  onValueChange,
  allowNegative = false,
  ...rest
}: Props) {
  const [inner, setInner] = useState(() =>
    defaultValue === null || defaultValue === undefined ? "" : String(defaultValue)
  );
  const raw = value !== undefined ? String(value) : inner;

  return (
    <>
      <input type="hidden" name={name} value={raw} />
      <input
        {...rest}
        type="text"
        inputMode={allowNegative ? "text" : "numeric"}
        value={groupThousands(raw)}
        onChange={(e) => {
          const next = stripThousands(e.target.value, allowNegative);
          if (value === undefined) setInner(next);
          onValueChange?.(next);
        }}
      />
    </>
  );
}
