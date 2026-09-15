import { backupFileName, listBackups, runBackup } from "./backup";

/**
 * Sao lưu hằng ngày do chính app chạy, không cần cài cron trên máy chủ.
 *
 * Trung tâm chỉ có một VPS và không ai quản trị máy chủ thường xuyên — bắt
 * cài cron tay là chuyện dễ quên nhất, mà quên thì toàn bộ dữ liệu nằm trên
 * đúng một file không có bản dự phòng nào. Để app tự lo thì cài đặt xong là
 * chạy, khởi động lại vẫn chạy.
 *
 * Cách làm đơn giản nhất mà vẫn đúng: cứ mỗi giờ nhìn xem hôm nay đã có bản
 * sao lưu chưa, chưa thì tạo. Không cần canh đúng nửa đêm, và app có tắt
 * ngang qua đêm thì sáng bật lên vẫn có bản của ngày hôm đó.
 */
const CHECK_EVERY_MS = 60 * 60 * 1000;
const FIRST_CHECK_MS = 30 * 1000;

declare global {
  var __musicnoteAutoBackup: boolean | undefined;
}

function backupIfMissingToday() {
  try {
    const wanted = backupFileName();
    if (listBackups().some((b) => b.name === wanted)) return;
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
  setTimeout(backupIfMissingToday, FIRST_CHECK_MS).unref();
  setInterval(backupIfMissingToday, CHECK_EVERY_MS).unref();
}
