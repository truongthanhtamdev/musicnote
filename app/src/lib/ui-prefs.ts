/**
 * Giao diện dễ nhìn theo từng máy: kiểu màu + cỡ chữ. Lưu trong localStorage
 * (không cần đăng nhập, không gọi máy chủ) và gắn lên <html> dưới dạng
 * data-ui-color / data-ui-size — globals.css lo phần đổi màu.
 */
export const UI_COLOR_KEY = "ui-color";
export const UI_SIZE_KEY = "ui-size";

export const UI_COLORS = [
  { value: "", label: "Chuẩn", hint: "Màu mặc định của trung tâm" },
  { value: "ro", label: "Rõ nét", hint: "Chữ đậm màu, viền rõ — dễ đọc dưới nắng / màn hình mờ" },
  { value: "diu", label: "Dịu mắt", hint: "Nền kem ấm, bớt chói khi nhìn lâu hay dạy buổi tối" },
] as const;

export const UI_SIZES = [
  { value: "", label: "Vừa" },
  { value: "lon", label: "Lớn" },
  { value: "rat-lon", label: "Rất lớn" },
] as const;

/**
 * Chạy ngay đầu <body>, trước khi trang vẽ ra — nên không bị nháy từ màu
 * chuẩn sang màu đã chọn. Bọc try vì trình duyệt chặn localStorage thì ném lỗi.
 */
export const UI_PREFS_SCRIPT = `try{var d=document.documentElement,c=localStorage.getItem("${UI_COLOR_KEY}"),s=localStorage.getItem("${UI_SIZE_KEY}");if(c)d.setAttribute("data-ui-color",c);if(s)d.setAttribute("data-ui-size",s)}catch(e){}`;

export function applyUiPref(attr: "data-ui-color" | "data-ui-size", key: string, value: string) {
  const d = document.documentElement;
  if (value) d.setAttribute(attr, value);
  else d.removeAttribute(attr);
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Không lưu được thì vẫn áp cho lần xem này.
  }
}
