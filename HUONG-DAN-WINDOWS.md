# Chạy hệ thống quản lý trên máy Windows

Hệ thống này là một web app tự chạy trên máy — không phải trang web có sẵn trên
mạng. Máy nào chạy thì mở được ở máy đó; muốn cả trung tâm cùng dùng thì phải
đưa lên máy chủ (xem mục cuối).

## Lần đầu: 3 bước

### Bước 1 — Cài Node.js (chỉ làm 1 lần)

Vào https://nodejs.org → tải bản **LTS** cho Windows → cài, bấm Next tới hết,
không cần đổi gì. Cài xong nên khởi động lại máy.

### Bước 2 — Tải mã nguồn về máy

Vào https://github.com/truongthanhtamdev/musicnote → bấm nút chọn nhánh (chỗ
đang ghi `main`) → chọn **`claude/facebook-customer-management-nd4rys`** →
bấm nút xanh **Code** → **Download ZIP**.

> Chọn đúng nhánh này mới có phần **Khách tiềm năng**; nhánh `main` chưa có.

Giải nén file ZIP ra một thư mục dễ nhớ, ví dụ `D:\musicnote`.

### Bước 3 — Chạy

Mở thư mục vừa giải nén, bấm đúp vào file:

```
chay-tren-windows.bat
```

Lần đầu nó sẽ tải thư viện (2–5 phút, tuỳ mạng), sau đó tự mở trình duyệt vào
`http://localhost:3000`.

Đăng nhập: **admin@musicnote.local** / **admin123** — đổi mật khẩu ngay sau đó.

**Để tắt:** đóng cửa sổ đen. Muốn dùng lại thì bấm đúp file `.bat` lần nữa
(những lần sau chạy nhanh, không phải tải lại thư viện).

## Dữ liệu nằm ở đâu?

Toàn bộ dữ liệu nằm trong 1 file: `app\data\musicnote.db`.

- **Sao lưu** = copy file đó ra USB / Google Drive. Nên làm hàng tuần.
- Xoá file đó là mất sạch dữ liệu, cẩn thận.
- Tải bản mã nguồn mới về thì **giữ lại file này**, chép đè vào thư mục mới.

## Gặp lỗi thì xử lý thế nào

| Hiện tượng | Cách xử lý |
|---|---|
| Cửa số đen hiện rồi tắt ngay | Chạy file `.bat` bằng cách bấm chuột phải → *Run as administrator*, hoặc chụp màn hình dòng chữ đỏ gửi lại |
| Báo `'node' is not recognized` | Chưa cài Node.js, hoặc cài xong chưa khởi động lại máy — làm lại Bước 1 |
| Lỗi khi cài `better-sqlite3` | Máy thiếu công cụ biên dịch. Cài lại Node.js và **tick ô "Tools for Native Modules"** trong lúc cài |
| Báo `port 3000 is already in use` | Đang có cửa sổ khác chạy sẵn — đóng hết cửa sổ đen rồi chạy lại |
| Trình duyệt báo không kết nối được | Đợi thêm ~20 giây rồi tải lại trang; cửa sổ đen phải luôn mở thì web mới chạy |
| Đăng nhập báo sai mật khẩu | Nếu đã đổi mật khẩu admin từ trước thì dùng mật khẩu mới; tài khoản mặc định chỉ tạo ở lần chạy đầu tiên |

## Cho máy khác trong cùng WiFi vào chung

Trên máy đang chạy, mở CMD trong thư mục `app` và chạy:

```
npm run dev -- -H 0.0.0.0
```

Xem IP máy đó bằng lệnh `ipconfig` (dòng *IPv4 Address*, ví dụ `192.168.1.12`),
rồi máy khác vào `http://192.168.1.12:3000`. Lần đầu Windows sẽ hỏi cho phép
qua tường lửa — chọn **Allow**.

Cách này chỉ dùng trong cùng mạng WiFi và máy chủ phải luôn bật.

## Muốn cả trung tâm dùng mọi lúc, mọi nơi

Cần thuê **VPS** (máy chủ ảo chạy 24/7, khoảng 100–200k/tháng) rồi cài lên đó,
gắn tên miền. Lúc đó giáo vụ và giáo viên chỉ cần vào đường link như một web
bình thường, không phải cài gì. Xem thêm mục "Triển khai (production)" trong
`app/README.md`.
