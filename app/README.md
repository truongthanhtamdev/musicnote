# Piano Guitar Đệm Hát — Quản lý điểm danh & chấm công giáo viên

Web app cho trung tâm dạy guitar online 1 kèm 1 (~200 lớp): điểm danh buổi học,
chấm công theo buổi, quản lý khung giờ rảnh của giáo viên, và giao lớp học
dựa trên lịch rảnh. Xây bằng Next.js (App Router) + SQLite, chạy được trên
một VPS nhỏ, không cần dịch vụ ngoài.

## Vai trò

| Vai trò | Quyền |
|---|---|
| **Admin** | Toàn quyền: tạo tài khoản cho Giáo vụ/Giáo viên/Học viên, quản lý giáo viên & lương/buổi, quản lý lớp, giao lớp, sửa điểm danh, xem/xuất báo cáo lương, quản lý doanh thu & lợi nhuận. |
| **Giáo vụ** (coordinator) | Tạo/sửa lớp học, giao lớp cho giáo viên, xem & sửa nhật ký điểm danh. Không xem/sửa được lương hay tài khoản. |
| **Giáo viên** | Xem lớp được giao, **tự thêm lớp mới của mình** (học sinh + thứ/giờ học) và sửa lịch lớp mình đang dạy, điểm danh buổi học hôm nay (kèm nội dung bài học + tick "đã điểm danh trên Facebook"), đánh dấu khung giờ bận trong tuần, xem lịch dạy & thu nhập của mình. |
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
  động lại khi máy chủ reboot. Khi đã có HTTPS thật, đặt thêm biến môi trường
  `COOKIE_SECURE=true` để cookie đăng nhập chỉ gửi qua kết nối mã hoá. **Nếu
  chưa có HTTPS (chạy tạm qua `http://ip:port`), để trống biến này** — đặt
  `true` khi chưa có HTTPS sẽ khiến trình duyệt từ chối lưu cookie và liên
  tục bị đá về trang đăng nhập.
- **Sao lưu tự động hàng đêm**: cài 1 dòng cron để chạy sẵn script trong repo
  (dùng `VACUUM INTO` của SQLite nên an toàn kể cả khi app đang chạy) — mỗi
  đêm tạo 1 file `DATA_DIR/backups/musicnote-YYYY-MM-DD.db`, tự xoá bản cũ
  chỉ giữ 30 bản gần nhất:

  ```bash
  crontab -e
  # thêm dòng này (2h sáng mỗi ngày), sửa lại đường dẫn cho đúng máy bạn:
  0 2 * * * cd /root/musicnote/app && /usr/bin/node scripts/backup.mjs >> /var/log/musicnote-backup.log 2>&1
  ```

  Kiểm tra cron chạy chưa: vào app, mục **Sao lưu dữ liệu** — trang này hiện
  bản mới nhất, danh sách các bản trên máy chủ, và cảnh báo nếu hôm nay chưa
  có bản nào. Vẫn nên thỉnh thoảng bấm **"Tải dữ liệu mới nhất về máy"** để
  giữ 1 bản ngoài máy chủ (phòng khi hỏng ổ đĩa/mất VPS).
- Đặt `AUTH_SECRET` là một chuỗi ngẫu nhiên dài, giữ bí mật và **không đổi**
  sau khi đã có người đăng nhập (đổi sẽ làm mất hiệu lực mọi phiên đăng
  nhập hiện tại).

## Các luồng chính

- **Admin/Giáo vụ → Lớp học**: thêm lớp mới (học sinh, thứ/giờ học cố
  định hàng tuần, thời lượng), sửa thông tin, tạm dừng/kết thúc lớp. Lớp có
  thể chọn **Linh động** (không có lịch cố định hàng tuần) thay vì cố định —
  lớp linh động không hiện trong "Hôm nay"/"Buổi tiếp theo" (vì không có
  ngày cố định để tính), giáo viên điểm danh từng buổi qua "Lịch sử điểm
  danh → + Điểm danh buổi học bù" mỗi khi có buổi học thực tế. Giáo viên tự
  thêm lớp của mình cũng sửa/xoá được lớp đó (ví dụ thêm nhầm hoặc cần cập
  nhật lại lịch đã điền).
- **Admin/Giáo vụ → Giao lớp**: danh sách lớp chưa có giáo viên; hệ thống
  gợi ý giáo viên đang rảnh khung giờ đó (đánh dấu ✓), bấm để giao ngay. Khi
  admin/Giáo vụ **tạo lớp mới rồi gán luôn giáo viên**, hoặc giao một lớp có
  sẵn cho giáo viên ở trang này, hệ thống tự gửi **thông báo** cho giáo viên
  đó (hiện ở đầu trang khi họ đăng nhập, bấm "Đã đọc" để ẩn) và **tự động
  tính buổi đầu tiên là buổi học thử** (50.000đ/tiết, không cần tick tay) —
  chỉ áp dụng cho lớp đi qua luồng này; lớp giáo viên **tự thêm** (thường là
  lớp cũ đang backfill dữ liệu) không tự tính buổi thử.
- **Admin → Chi tiết giáo viên**: có **1 bảng lịch dạng lưới** theo ngày/giờ
  gộp chung lớp đang dạy và khung giờ bận — ô vàng là lớp (bấm để xem chi
  tiết), ô xám là giáo viên tự đánh dấu bận, ô trống là rảnh (bấm để thêm lớp
  mới ngay khung giờ đó, tự gán cho giáo viên này).
- **Giáo viên → Lịch dạy**: tự thêm lớp học mới của mình (tên học sinh, thứ/giờ
  học cố định hàng tuần, môn học, ngôn ngữ giảng dạy, và nguồn lớp — "Trung tâm
  giao" hay "GV tự tìm học viên") — hệ thống tự gán lớp cho chính giáo viên đó,
  và có thể sửa lại/xoá lớp mình đang dạy nếu nhập sai. Bấm "Lịch sử" trên
  từng lớp để xem riêng lịch sử điểm danh của học viên đó (không lẫn với các
  học viên khác).
- **Môn học & ngôn ngữ**: mỗi lớp có môn học (Guitar/Piano/Violin/Saxophone/
  Thanh nhạc — hoặc tự gõ môn khác) và ngôn ngữ giảng dạy (Tiếng Việt/Tiếng
  Anh). Mỗi giáo viên khai báo chuyên môn (chọn được nhiều môn) và ngôn ngữ
  mình dạy được — trang Giao lớp sẽ cảnh báo nếu định giao lớp cho giáo viên
  chưa khai chuyên môn đó hoặc chưa dạy được tiếng Anh (giáo viên chưa khai
  chuyên môn thì mặc định coi như dạy được mọi môn, để không ảnh hưởng giáo
  viên đã tạo từ trước).
- **Phụ huynh**: với học sinh là trẻ em, có thể ghi thêm tên phụ huynh/người
  đóng học phí (khác với tên học sinh) để tiện liên hệ, thu học phí.
- **Gói học (20/50/100 tiết)**: mỗi lớp có thể gắn 1 gói học; hệ thống tự đếm
  số buổi "Đã dạy" tính từ ngày bắt đầu gói để ra số tiết đã học/còn lại
  (cảnh báo màu cam khi còn ≤ 3 tiết). Bấm "Gia hạn (làm mới)" khi học viên
  mua gói mới — chỉ tính lại từ ngày gia hạn, không xoá lịch sử cũ. Trang
  Tổng quan của Admin có mục **"Học viên sắp hết khóa"** liệt kê tất cả học
  viên còn ≤ 3 tiết trên toàn hệ thống. Số buổi "Đã học" tự đếm được, nhưng
  Admin (trang chi tiết lớp) hoặc Giáo viên (trang Lịch dạy, hoặc ngay trên
  thẻ điểm danh ở "Hôm nay") đều bấm **"Sửa"** để nhập tay một mốc — ví dụ
  nhập lớp cũ vào hệ thống mà học viên đã học sẵn 15 buổi thì nhập "15" —
  **từ lúc đó số buổi tự cộng thêm mỗi khi điểm danh mới**, không bị đứng yên
  ở mốc đã nhập. Bấm nút bên cạnh để bỏ mốc tay, quay về tính tự động hoàn
  toàn theo điểm danh từ ngày bắt đầu gói.
- **Học nhiều buổi/tuần**: khi thêm lớp mới (cả ở trang Admin/Giáo vụ và
  trang Giáo viên tự thêm), bấm **"+ Thêm buổi/tuần"** để khai nhiều Thứ/giờ
  cùng lúc cho 1 học viên — ví dụ học Thứ 2 và Thứ 5 mỗi tuần — hệ thống tự
  tạo các lịch học riêng và **dùng chung 1 gói** cho tất cả (nếu chọn gói).
  Sau này vẫn có thể dùng chung/tách gói thủ công ở trang chi tiết lớp như
  trước.
- **Buổi học bù / dời lịch**: khi 1 buổi bị dời qua ngày khác với lịch cố
  định hàng tuần, giáo viên vào **Lịch sử điểm danh → "+ Điểm danh buổi học
  bù"**, chọn đúng lớp và ngày dạy bù thực tế để điểm danh — buổi này vẫn
  tính vào gói học của học viên như bình thường.
- **Buổi thứ mấy khi điểm danh**: mỗi lần điểm danh (cả ở "Hôm nay", khi sửa
  lại trong Lịch sử điểm danh, và ở form điểm danh bù) đều có ô **"Buổi thứ
  mấy"** — hệ thống tự điền sẵn số buổi đang tính, giáo viên sửa lại được nếu
  sai (ví dụ lớp cũ đã học sẵn 15 buổi thì gõ 15). Số vừa gõ thành mốc mới và
  các buổi sau **tự đếm tiếp** từ đó; để nguyên số hệ thống điền sẵn thì vẫn
  chạy tự động như bình thường.
- **Buổi học thử**: không cần tick tay — **buổi 0 chính là buổi học thử**. Lớp
  vừa được center tạo/giao cho giáo viên (mục Giao lớp ở trên) tự điền sẵn
  "buổi 0" ở lần điểm danh đầu, tính lương theo giá cố định 50.000đ/tiết
  (không theo đơn giá thường) và không trừ vào gói học; các buổi sau đánh số
  1, 2, 3... và tính lương bình thường. Giáo viên cũng có thể tự gõ 0 cho bất
  kỳ buổi nào đúng là buổi thử. Trang Chấm công/Lương và file CSV xuất ra có
  cột riêng đếm số buổi thử.
- **Buổi tiếp theo & cảnh báo quên điểm danh**: trang Lớp học hiện cột "Buổi
  tiếp theo" (ngày của buổi kế tiếp theo lịch cố định hàng tuần) và tô đỏ
  dòng nào đã quá lịch tuần này mà chưa có điểm danh. Trang Tổng quan cũng tô
  đỏ các lớp hôm nay đã quá giờ học mà giáo viên vẫn chưa điểm danh, để admin
  dễ theo dõi và quyết định miss công hay du di.
- **Nội dung bài học**: mỗi lần điểm danh, giáo viên ghi lại buổi đó đã dạy
  gì; nội dung này hiện trong lịch sử điểm danh (Admin/Giáo vụ/Giáo viên) và
  trong trang của Học viên, giúp theo dõi học viên đã học tới đâu.
- **Tài khoản Học viên**: Admin tạo tài khoản rồi gắn vào lớp (ở trang chi
  tiết lớp học) để học viên tự đăng nhập xem tiến độ gói học và nội dung các
  buổi học gần đây. Đăng nhập bằng Email hoặc SĐT tuỳ theo cách tạo tài khoản.
- **Giáo viên → Lịch tuần**: lưới theo tuần (30 phút/ô, 07:00–22:00) gộp
  chung lớp đang dạy (ô vàng, chỉ xem) và khung giờ bận cá nhân (ô xám) —
  **mặc định mọi ô đều rảnh**, chỉ cần bấm đánh dấu những khung giờ mình bận
  (không nhận lớp được); bấm lại để bỏ đánh dấu, hoặc "rảnh cả ngày" ở đầu
  cột để bỏ hết trong 1 ngày.
- **Xuất file Excel/CSV**: trang **Lịch & điểm danh**, **Chấm công/Lương** và
  **Doanh thu** đều có nút **"Xuất CSV"** — xuất đúng những gì đang lọc trên
  màn hình (khoảng ngày, giáo viên, trạng thái), mở thẳng bằng Excel/Google
  Sheets. File điểm danh có sẵn cột "Buổi thứ" và cột đánh dấu buổi học thử.
- **Admin → Sao lưu dữ liệu**: bấm **"Tải dữ liệu mới nhất về máy"** để tải
  toàn bộ dữ liệu về thành 1 file `.db` (mở xem được bằng phần mềm miễn phí
  "DB Browser for SQLite"). Trang này cũng liệt kê các bản sao lưu tự động
  hàng đêm trên máy chủ (tải lại được từng bản), và cảnh báo nếu hôm nay
  chưa có bản nào — xem phần Triển khai ở trên để cài lịch cron. Khôi phục:
  chép file `.db` đè lên `DATA_DIR/musicnote.db` rồi khởi động lại app.
- **Admin/Giáo vụ → Nhập dữ liệu**: tải lên file CSV để tạo hàng loạt
  giáo viên/lớp học một lần (hữu ích khi đưa ~200 lớp có sẵn vào hệ thống),
  có file mẫu tải sẵn và báo lỗi theo từng dòng.
- **Giáo viên → Hôm nay**: danh sách lớp trong ngày, điểm danh 1 lần/lớp/buổi
  (trạng thái: Đã dạy / GV vắng / HS vắng / Dời lịch), có ô ghi chú và ô tick
  xác nhận đã điểm danh Facebook.
- **Admin → Chấm công / Lương**: chọn khoảng ngày, hệ thống tính
  `số buổi "Đã dạy" × đơn giá/buổi` cho từng giáo viên, xuất file CSV để trả
  lương. Bấm vào **tên giáo viên** để xem ngay nhật ký điểm danh của người đó
  trong đúng khoảng ngày đang tính lương (đối chiếu từng buổi).
- **Admin → Doanh thu**: ghi nhận từng khoản học phí thu được (số tiền, ngày,
  có thể gắn với 1 lớp cụ thể) và chi phí phát sinh (quảng cáo, vận hành...,
  loại tự gõ). Khi chọn 1 lớp có gói học, số tiền tự điền sẵn theo bảng giá
  (Guitar 20 tiết: 7,5tr, 50 tiết: 15tr · Piano/Violin/Thanh nhạc 20 tiết:
  8tr, 50 tiết: 16tr — gói 100 tiết hoặc môn khác tự nhập tay), admin vẫn sửa
  lại được nếu giá thực tế khác. Chọn khoảng ngày (mặc định theo tháng hiện
  tại) để xem
  **Doanh thu, Lương giáo viên, Chi phí khác, Lợi nhuận** (= doanh thu − lương
  − chi phí), xuất file CSV hàng tháng để gửi báo cáo.

## Ngăn xếp công nghệ

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS ·
SQLite qua `better-sqlite3` · JWT trong cookie httpOnly cho phiên đăng nhập.
