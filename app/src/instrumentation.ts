/**
 * Chạy một lần khi máy chủ khởi động. Dùng để bật lịch sao lưu hằng ngày —
 * nạp động vì better-sqlite3 chỉ chạy được ở runtime Node.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startAutoBackup } = await import("./lib/auto-backup");
  startAutoBackup();
}
