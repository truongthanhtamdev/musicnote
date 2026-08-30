# Piano Guitar Đệm Hát Nhẹ — Quản lý điểm danh & chấm công giáo viên

Web app cho trung tâm dạy guitar online 1 kèm 1 (~200 lớp): điểm danh buổi học,
chấm công theo buổi, quản lý khung giờ rảnh của giáo viên, và giao lớp học
dựa trên lịch rảnh. Xây bằng Next.js (App Router) + SQLite, chạy được trên
một VPS nhỏ, không cần dịch vụ ngoài.

## Vai trò

| Vai trò | Quyền |
|---|---|
| **Admin** | Toàn quyền: tạo tài khoản cho Giáo vụ/Giáo viên/Học viên, quản lý giáo viên & lương/buổi, quản lý lớp, giao lớp, sửa điểm danh, xem/xuất báo cáo lương. |
| **Giáo vụ** (coordinator) | Tạo/sửa lớp học, giao lớp cho giáo viên, xem & sửa nhật ký điểm danh. Không xem/sửa được lương hay tài khoản. |
| **Giáo viên** | Xem lớp được giao, **tự thêm lớp mới của mình** (học sinh + thứ/giờ học) và sửa lịch lớp mình đang dạy, điểm danh buổi học hôm nay (kèm nội dung bài học + tick "đã điểm danh trên Facebook"), cập nhật khung giờ rảnh theo tuần, xem lịch dạy & thu nhập của mình. |
| **Học viên** | Đăng nhập xem lớp học của mình: tiến độ gói học (đã học/còn lại bao nhiêu tiết) và nội dung các buổi học gần đây. Chỉ xem, không sửa được gì. |

Lưu ý: hệ thống **không thay thế** việc điểm danh trên nhóm Facebook — giáo
viên vẫn cần điểm danh song song ở cả hai nơi như quy định hiện tại của
trung tâm; hệ thống chỉ có ô tick để xác nhận đã làm việc đó.

## Tài khoản khi chạy lần đầu

Lần đầu khởi động, hệ thống chỉ tạo sẵn **1 tài khoản Admin**, không có dữ
liệu demo nào khác:

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | admin@musicnote.local | admin123 |

**Đổi mật khẩu này ngay khi đăng nhập lần đầu.** Sau đó Admin là người tạo
toàn bộ tài khoản còn lại (Giáo vụ ở trang **Nhân sự quản lý**, Giáo viên ở
trang **Giáo viên**, Học viên ở trang **Học viên**) và nhập lớp học (thủ công
hoặc import CSV hàng loạt).

## Chạy thử (development)

```bash
npm install
cp .env.example .env.local   # rồi sửa AUTH_SECRET
npm run dev
```

Mở http://localhost:3000 — lần chạy đầu tiên hệ thống tự tạo file SQLite tại
`data/musicnote.db` và chèn sẵn tài khoản Admin ở trên.

## Triển khai (production)

Ứng dụng dùng SQLite lưu trên đĩa cục bộ (`data/musicnote.db`), nên cần một
máy chủ Node.js **có ổ đĩa lưu trữ lâu dài** (VPS, Docker container có
volume...). Không dùng được trên nền tảng serverless không lưu trạng thái
(Vercel mặc định, v.v.) vì mỗi lần gọi hàm dữ liệu sẽ mất.

```bash
npm install
npm run build
AUTH_SECRET="chuoi-bi-mat-rat-dai-va-ngau-nhien" \
DATA_DIR="/var/lib/musicnote/data" \
npm run start -- -p 3000
```

Gợi ý:
- Chạy phía sau Nginx/Caddy với HTTPS, và dùng `pm2` hoặc systemd để tự khởi
  động lại khi máy chủ reboot.
- Sao lưu định kỳ thư mục `DATA_DIR` (chính là toàn bộ dữ liệu: giáo viên,
  lớp học, điểm danh, lịch rảnh).
- Đặt `AUTH_SECRET` là một chuỗi ngẫu nhiên dài, giữ bí mật và **không đổi**
  sau khi đã có người đăng nhập (đổi sẽ làm mất hiệu lực mọi phiên đăng
  nhập hiện tại).

## Các luồng chính

- **Admin/Giáo vụ → Lớp học**: thêm lớp mới (học sinh, thứ/giờ học cố
  định hàng tuần, thời lượng), sửa thông tin, tạm dừng/kết thúc lớp.
- **Admin/Giáo vụ → Giao lớp**: danh sách lớp chưa có giáo viên; hệ thống
  gợi ý giáo viên có khung giờ rảnh trùng lịch lớp (đánh dấu ✓), bấm để giao
  ngay.
- **Giáo viên → Lịch dạy**: tự thêm lớp học mới của mình (tên học sinh, thứ/giờ
  học cố định hàng tuần, môn học, ngôn ngữ giảng dạy, và nguồn lớp — "Trung tâm
  giao" hay "GV tự tìm học viên") — hệ thống tự gán lớp cho chính giáo viên đó,
  và có thể sửa lại lớp mình đang dạy nếu nhập sai.
- **Môn học & ngôn ngữ**: mỗi lớp có môn học (Guitar/Piano/Violin/Thanh nhạc —
  hoặc tự gõ môn khác) và ngôn ngữ giảng dạy (Tiếng Việt/Tiếng Anh). Mỗi giáo
  viên khai báo ngôn ngữ mình dạy được — trang Giao lớp sẽ cảnh báo nếu định
  giao lớp tiếng Anh cho giáo viên chưa dạy được tiếng Anh.
- **Phụ huynh**: với học sinh là trẻ em, có thể ghi thêm tên phụ huynh/người
  đóng học phí (khác với tên học sinh) để tiện liên hệ, thu học phí.
- **Gói học (20/50/100 tiết)**: mỗi lớp có thể gắn 1 gói học; hệ thống tự đếm
  số buổi "Đã dạy" tính từ ngày bắt đầu gói để ra số tiết đã học/còn lại
  (cảnh báo màu cam khi còn ≤ 3 tiết). Bấm "Gia hạn (làm mới)" khi học viên
  mua gói mới — chỉ tính lại từ ngày gia hạn, không xoá lịch sử cũ.
- **Nội dung bài học**: mỗi lần điểm danh, giáo viên ghi lại buổi đó đã dạy
  gì; nội dung này hiện trong lịch sử điểm danh (Admin/Giáo vụ/Giáo viên) và
  trong trang của Học viên, giúp theo dõi học viên đã học tới đâu.
- **Tài khoản Học viên**: Admin tạo tài khoản rồi gắn vào lớp (ở trang chi
  tiết lớp học) để học viên tự đăng nhập xem tiến độ gói học và nội dung các
  buổi học gần đây. Đăng nhập bằng Email hoặc SĐT tuỳ theo cách tạo tài khoản.
- **Giáo viên → Khung giờ rảnh**: lưới theo tuần (30 phút/ô, 07:00–22:00),
  bấm để bật/tắt khung giờ có thể nhận lớp.
- **Admin/Giáo vụ → Nhập dữ liệu**: tải lên file CSV để tạo hàng loạt
  giáo viên/lớp học một lần (hữu ích khi đưa ~200 lớp có sẵn vào hệ thống),
  có file mẫu tải sẵn và báo lỗi theo từng dòng.
- **Giáo viên → Hôm nay**: danh sách lớp trong ngày, điểm danh 1 lần/lớp/buổi
  (trạng thái: Đã dạy / GV vắng / HS vắng / Dời lịch), có ô ghi chú và ô tick
  xác nhận đã điểm danh Facebook.
- **Admin → Chấm công / Lương**: chọn khoảng ngày, hệ thống tính
  `số buổi "Đã dạy" × đơn giá/buổi` cho từng giáo viên, xuất file CSV để trả
  lương.

## Ngăn xếp công nghệ

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS ·
SQLite qua `better-sqlite3` · JWT trong cookie httpOnly cho phiên đăng nhập.
