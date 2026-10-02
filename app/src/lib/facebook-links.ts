/**
 * Link Facebook / Messenger của trung tâm. Không đụng database — dùng được ở
 * trình duyệt (nút mở app) lẫn máy chủ.
 */

/** Tên tài khoản trong link hồ sơ: facebook.com/truongnthanhtam → "truongnthanhtam". */
export function facebookUsername(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/(^|\.)(facebook\.com|fb\.com|fb\.me|m\.me)$/i.test(u.hostname)) return null;
    const first = u.pathname.split("/").filter(Boolean)[0];
    if (!first || ["profile.php", "share", "groups", "pages", "people"].includes(first)) return null;
    return /^[A-Za-z0-9.]{3,}$/.test(first) ? first : null;
  } catch {
    return null;
  }
}

/** Link mở thẳng khung chat Messenger; không đọc được tên tài khoản thì dùng lại link Facebook. */
export function messengerUrl(facebookUrl: string | null | undefined): string | null {
  const name = facebookUsername(facebookUrl);
  return name ? `https://m.me/${name}` : (facebookUrl ?? null);
}
