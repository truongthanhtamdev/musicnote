import { COUNTRIES } from "@/lib/types";

/**
 * Ô "Quốc gia" của khách: gõ hoặc chọn từ gợi ý (Việt Nam, Mỹ, Úc…), nước
 * khác gõ tay vẫn được. Dùng chung cho form tạo lớp và sửa lớp.
 */
export function CountryField({
  defaultValue,
  required = false,
  className,
  id = "a-country",
}: {
  defaultValue?: string | null;
  required?: boolean;
  className: string;
  id?: string;
}) {
  return (
    <>
      <input
        id={id}
        name="country"
        list={`${id}-list`}
        required={required}
        defaultValue={defaultValue ?? ""}
        maxLength={60}
        autoComplete="off"
        aria-label="Quốc gia của khách"
        placeholder="Khách đang ở nước nào?"
        className={className}
      />
      <datalist id={`${id}-list`}>
        {COUNTRIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  );
}
