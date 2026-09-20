/**
 * Chạy một lần khi máy chủ khởi động. Dùng để bật các việc nền: sao lưu hằng
 * ngày, bot Telegram và lịch nhắc học — nạp động vì better-sqlite3 chỉ chạy
 * được ở runtime Node.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startAutoBackup } = await import("./lib/auto-backup");
  startAutoBackup();

  // Cả hai đều tự thoát ngay khi chưa khai TELEGRAM_BOT_TOKEN.
  const { startTelegramBot } = await import("./lib/telegram-bot");
  const { startTelegramReminders } = await import("./lib/telegram-reminders");
  startTelegramBot();
  startTelegramReminders();
}
