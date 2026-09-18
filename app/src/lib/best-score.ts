/**
 * Kỷ lục game lưu trong máy người chơi (localStorage), không cần tài khoản.
 *
 * Chỉ gọi từ sự kiện (bấm nút) hoặc lúc kết thúc lượt — không gọi lúc render
 * vì máy chủ không có localStorage, và không gọi trong effect vì phải vẽ lại
 * thêm một lần cho mỗi lượt.
 */
export function readBest(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? Number(raw) || null : null;
  } catch {
    return null;
  }
}

/** Ghi nếu cao hơn kỷ lục cũ; trả về kỷ lục sau khi ghi. */
export function saveBest(key: string, score: number): number {
  const prev = readBest(key);
  if (prev != null && prev >= score) return prev;
  try {
    localStorage.setItem(key, String(score));
  } catch {
    // Trình duyệt chặn lưu (ẩn danh) thì vẫn hiện trong phiên này.
  }
  return score;
}

/** Xáo trộn mảng (Fisher–Yates), trả về mảng mới. */
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
