# Đưa hệ thống lên VPS

Sau khi cài xong, giáo vụ và giáo viên chỉ cần mở đường link như một web bình
thường, không phải cài gì. Máy tính của bạn tắt cũng không ảnh hưởng.

## Chuẩn bị

- VPS chạy **Ubuntu 22.04 hoặc 24.04**, tối thiểu 1GB RAM.
- Nhà cung cấp gửi cho bạn: **địa chỉ IP** + **mật khẩu root** (hoặc SSH key).
- Tên miền thì tuỳ chọn — chưa có vẫn dùng được bằng địa chỉ IP.

## Bước 1 — Kết nối vào VPS

Trên Windows, mở **PowerShell** (nhấn `Windows`, gõ *PowerShell*, Enter) rồi gõ:

```
ssh root@123.45.67.89
```

Thay `123.45.67.89` bằng IP của bạn. Lần đầu nó hỏi `yes/no` → gõ `yes`, sau đó
nhập mật khẩu (gõ mật khẩu sẽ **không hiện ký tự nào**, cứ gõ rồi Enter).

## Bước 2 — Chạy 1 lệnh cài đặt

**Nếu đã có tên miền** (đã trỏ bản ghi A của tên miền về IP VPS):

```
curl -fsSL https://raw.githubusercontent.com/truongthanhtamdev/musicnote/claude/facebook-customer-management-nd4rys/deploy/setup-vps.sh | sudo bash -s -- quanly.tenmiencuaban.com
```

**Nếu chưa có tên miền:**

```
curl -fsSL https://raw.githubusercontent.com/truongthanhtamdev/musicnote/claude/facebook-customer-management-nd4rys/deploy/setup-vps.sh | sudo bash
```

Chạy khoảng 3–7 phút. Xong nó in ra địa chỉ để vào và thông tin đăng nhập.

Script sẽ tự: cài Node.js 22 → tải mã nguồn → build → tạo dịch vụ tự khởi động
lại khi VPS reboot → bật tường lửa → cài HTTPS miễn phí (nếu có tên miền) →
hẹn giờ sao lưu dữ liệu hàng ngày.

## Bước 3 — Đăng nhập và đổi mật khẩu

Vào địa chỉ script in ra, đăng nhập `admin@musicnote.local` / `admin123`,
**đổi mật khẩu ngay**. Sau đó tạo tài khoản cho giáo vụ (trang *Nhân sự quản
lý*) và giáo viên (trang *Giáo viên*).

## Các lệnh cần nhớ

| Việc | Lệnh (chạy trong SSH) |
|---|---|
| Cập nhật lên bản mới nhất | `sudo bash /opt/musicnote/deploy/update.sh` |
| Xem hệ thống còn chạy không | `systemctl status musicnote` |
| Xem log khi có lỗi | `journalctl -u musicnote -n 50 --no-pager` |
| Khởi động lại | `sudo systemctl restart musicnote` |
| Sao lưu ngay lập tức | `sudo /usr/local/bin/musicnote-backup` |

## Dữ liệu và sao lưu

- File dữ liệu: `/var/lib/musicnote/data/musicnote.db`
- Bản sao lưu: `/var/backups/musicnote/` — tự chạy 3h15 sáng mỗi ngày, giữ 30 ngày.

**Nên tải bản sao lưu về máy mỗi tuần** (chạy trên máy Windows, không phải trong SSH):

```
scp root@123.45.67.89:/var/backups/musicnote/*.gz D:\backup-musicnote\
```

Khôi phục khi cần:

```
sudo systemctl stop musicnote
sudo gunzip -c /var/backups/musicnote/musicnote-2026-09-05-0315.db.gz > /var/lib/musicnote/data/musicnote.db
sudo chown musicnote:musicnote /var/lib/musicnote/data/musicnote.db
sudo systemctl start musicnote
```

## Gặp lỗi

| Hiện tượng | Xử lý |
|---|---|
| Vào link báo không kết nối được | `systemctl status musicnote` xem còn chạy không; chưa chạy thì xem `journalctl -u musicnote -n 50 --no-pager` |
| Tên miền chưa lên HTTPS | Bản ghi A của tên miền phải trỏ đúng IP VPS và đợi vài phút cho DNS lan; sau đó `sudo systemctl restart caddy` |
| Build báo hết bộ nhớ (VPS 1GB) | Tạo swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` rồi chạy lại |
| Muốn đổi sang nhánh khác | `sudo BRANCH=main bash /opt/musicnote/deploy/update.sh` |

## Bảo mật tối thiểu nên làm

1. Đổi mật khẩu admin ngay lần đăng nhập đầu.
2. Không đưa link cho người ngoài — đây là dữ liệu cá nhân của khách hàng.
3. Giữ file `/etc/musicnote.env` nguyên vẹn (chứa khoá ký phiên đăng nhập); đổi
   nội dung file này sẽ làm mọi người bị đăng xuất.
