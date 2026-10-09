import { BACKUP_EVERY_DAYS, listBackups, runBackup } from "./backup";

/**
 * Sao lưu hằng tuần do chính app chạy, không cần cài cron trên máy chủ.
 *
 * Trung tâm chỉ có một VPS và không ai quản trị máy chủ thường xuyên — bắt
 * cài cron tay là chuyện dễ quên nhất, mà quên thì toàn bộ dữ liệu nằm trên
 * đúng một file không có bản dự phòng nào. Để app tự lo thì cài đặt xong là
 * chạy, khởi động lại vẫn chạy.
 *
 * Cách làm đơn giản nhất mà vẫn đúng: cứ mỗi giờ nhìn xem bản sao lưu mới
 * nhất đã đủ 7 ngày chưa, đủ rồi (hoặc chưa có bản nào) thì tạo bản mới — và
 * tạo xong là tự xoá bớt bản cũ. App có tắt đúng lúc tới hạn thì bật lên vẫn
 * tạo bù.
 */
const CHECK_EVERY_MS = 60 * 60 * 1000;
const FIRST_CHECK_MS = 30 * 1000;

declare global {
  var __musicnoteAutoBackup: boolean | undefined;
}

function backupIfDue() {
  try {
    const newest = listBackups()[0];
    const dueMs = BACKUP_EVERY_DAYS * 24 * 60 * 60 * 1000;
    if (newest && Date.now() - newest.createdAt.getTime() < dueMs) return;
    const file = runBackup();
    console.log(`[sao-luu] đã tạo ${file.name}`);
  } catch (e) {
    // Sao lưu hỏng thì ghi log rồi thôi: chặn cả app vì không sao lưu được
    // còn tệ hơn nhiều so với việc thiếu một bản sao lưu.
    console.error("[sao-luu] không tạo được bản sao lưu:", e);
  }
}

export function startAutoBackup() {
  if (process.env.DISABLE_AUTO_BACKUP === "true") return;
  // Dev server nạp lại module liên tục — không chặn thì mỗi lần sửa code lại
  // thêm một bộ hẹn giờ nữa.
  if (globalThis.__musicnoteAutoBackup) return;
  globalThis.__musicnoteAutoBackup = true;

  // unref: bộ hẹn giờ không được giữ tiến trình sống, máy chủ HTTP lo việc đó.
  setTimeout(backupIfDue, FIRST_CHECK_MS).unref();
  setInterval(backupIfDue, CHECK_EVERY_MS).unref();
}
