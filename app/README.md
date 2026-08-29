# Piano Guitar Đệm Hát Nhẹ — Quản lý điểm danh & chấm công giáo viên

Web app cho trung tâm dạy guitar online 1 kèm 1 (~200 lớp): điểm danh buổi học,
chấm công theo buổi, quản lý khung giờ rảnh của giáo viên, và giao lớp học
dựa trên lịch rảnh. Xây bằng Next.js (App Router) + SQLite, chạy được trên
một VPS nhỏ, không cần dịch vụ ngoài.

## Vai trò

| Vai trò | Quyền |
|---|---|
| **Admin** | Toàn quyền: quản lý giáo viên & lương/buổi, quản lý lớp, giao lớp, sửa điểm danh, xem/xuất báo cáo lương, quản lý tài khoản Quản lý ca. |
| **Quản lý ca** (coordinator) | Tạo/sửa lớp học, giao lớp cho giáo viên, xem & sửa nhật ký điểm danh. Không xem/sửa được lương hay tài khoản. |
| **Giáo viên** | Xem lớp được giao, **tự thêm lớp mới của mình** (học sinh + thứ/giờ học) và sửa lịch lớp mình đang dạy, điểm danh buổi học hôm nay (kèm tick "đã điểm danh trên Facebook"), cập nhật khung giờ rảnh theo tuần, xem lịch dạy & thu nhập của mình. |

Lưu ý: hệ thống **không thay thế** việc điểm danh trên nhóm Facebook — giáo
viên vẫn cần điểm danh song song ở cả hai nơi như quy định hiện tại của
trung tâm; hệ thống chỉ có ô tick để xác nhận đã làm việc đó.

## Tài khoản demo (seed sẵn khi chạy lần đầu)

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | admin@musicnote.local | admin123 |
| Quản lý ca | manager@musicnote.local | manager123 |
| Giáo viên | long.guitar@musicnote.local | teacher123 |
| Giáo viên | mai.guitar@musicnote.local | teacher123 |

**Đổi các mật khẩu này (hoặc tạo tài khoản admin mới rồi vô hiệu hoá các tài
khoản demo) trước khi đưa vào dùng thật.**

## Chạy thử (development)

```bash
npm install
cp .env.example .env.local   # rồi sửa AUTH_SECRET
npm run dev
```

Mở http://localhost:3000 — lần chạy đầu tiên hệ thống tự tạo file SQLite tại
`data/musicnote.db` và chèn sẵn dữ liệu demo ở trên.

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

- **Admin/Quản lý ca → Lớp học**: thêm lớp mới (học sinh, thứ/giờ học cố
  định hàng tuần, thời lượng), sửa thông tin, tạm dừng/kết thúc lớp.
- **Admin/Quản lý ca → Giao lớp**: danh sách lớp chưa có giáo viên; hệ thống
  gợi ý giáo viên có khung giờ rảnh trùng lịch lớp (đánh dấu ✓), bấm để giao
  ngay.
- **Giáo viên → Lịch dạy**: tự thêm lớp học mới của mình (tên học sinh, thứ/giờ
  học cố định hàng tuần) — hệ thống tự gán lớp cho chính giáo viên đó, và có
  thể sửa lại lớp mình đang dạy nếu nhập sai.
- **Giáo viên → Khung giờ rảnh**: lưới theo tuần (30 phút/ô, 07:00–22:00),
  bấm để bật/tắt khung giờ có thể nhận lớp.
- **Admin/Quản lý ca → Nhập dữ liệu**: tải lên file CSV để tạo hàng loạt
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
