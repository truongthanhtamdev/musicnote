/**
 * Next gọi hàm này một lần khi máy chủ khởi động. Vòng lặp nhắc lịch chạy
 * ngay trong tiến trình web, nên người dùng không phải cài thêm cron trên
 * máy chủ — cài xong là nhắc việc chạy luôn.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Máy chủ thường để múi giờ UTC; không đặt lại thì sau 17h chiều Việt Nam
  // hệ thống đã coi như sang ngày mới và lịch hôm nay biến mất.
  process.env.TZ ||= "Asia/Ho_Chi_Minh";

  const { runReminderTick } = await import("./lib/reminders");

  const tick = () => {
    void runReminderTick();
  };

  // Chạy ngay một nhịp rồi lặp mỗi phút — đủ mịn cho mốc nhắc trước 15 phút.
  tick();
  const timer = setInterval(tick, 60_000);
  // Không giữ tiến trình sống chỉ vì cái hẹn giờ này.
  timer.unref?.();
}
