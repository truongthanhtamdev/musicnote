import { field, label } from "./ui";

/**
 * "Khách đến từ kênh nào" — chọn từ danh sách nguồn khách (sửa được ở trang
 * Khách tiềm năng) + một dòng ghi rõ thêm (bài quảng cáo nào, ai giới thiệu…).
 * Dùng chung cho form tạo lớp và form sửa lớp để số liệu nguồn khách khớp nhau.
 */
export function ChannelField({
  channels,
  required = false,
  defaultChannel,
  defaultNote,
  compact = false,
}: {
  channels: string[];
  required?: boolean;
  defaultChannel?: string | null;
  defaultNote?: string | null;
  /** Form sửa lớp: không nhãn, hai ô nằm cạnh nhau. */
  compact?: boolean;
}) {
  // Kênh cũ không còn trong danh sách vẫn phải hiện đúng, không thì lưu lại là mất.
  const options = defaultChannel && !channels.includes(defaultChannel) ? [defaultChannel, ...channels] : channels;
  const select = (
    <select
      id="a-channel"
      name="customer_channel"
      required={required}
      defaultValue={defaultChannel ?? ""}
      aria-label="Khách đến từ kênh nào"
      className={compact ? "rounded-xl border border-navy-200 px-3 py-2 text-sm" : field}
    >
      <option value="">{required ? "— Chọn kênh —" : "Khách đến từ kênh nào?"}</option>
      {options.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
  const note = (
    <input
      id={compact ? undefined : "a-channel-note"}
      name="customer_channel_note"
      defaultValue={defaultNote ?? ""}
      maxLength={200}
      aria-label="Ghi rõ kênh"
      placeholder="Ghi rõ: bài quảng cáo nào, ai giới thiệu…"
      className={compact ? "rounded-xl border border-navy-200 px-3 py-2 text-sm" : field}
    />
  );
  if (compact) {
    return (
      <>
        {select}
        {note}
      </>
    );
  }
  return (
    <div className="grid grid-cols-1 [&>*]:min-w-0 sm:grid-cols-2 gap-4">
      <div>
        <label className={label} htmlFor="a-channel">
          Khách đến từ kênh nào {required && <span className="text-coral-500">*</span>}
        </label>
        {select}
      </div>
      <div>
        <label className={label} htmlFor="a-channel-note">
          Ghi rõ thêm
        </label>
        {note}
      </div>
    </div>
  );
}
