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

## Chạy nhiều web trên cùng một VPS

Không có nguyên tắc "1 VPS chỉ 1 web". Một VPS là một máy tính — chạy được bao
nhiêu web là tuỳ RAM còn trống. Caddy đứng trước, nhìn tên miền rồi chuyển
tiếp vào đúng ứng dụng đang chạy ở cổng nội bộ tương ứng:

```
quanly.tenmien.com   →  Caddy  →  127.0.0.1:3000   (hệ thống quản lý này)
www.tenmien.com      →  Caddy  →  thư mục file tĩnh (web giới thiệu)
app2.tenmien.com     →  Caddy  →  127.0.0.1:3001   (một ứng dụng khác)
```

Mỗi web khai báo trong **một file riêng** ở `/etc/caddy/sites/*.caddy`, nên cài
thêm web mới không đụng gì tới web cũ. Ví dụ thêm một trang giới thiệu tĩnh:

```
sudo mkdir -p /var/www/gioithieu
# chép file html vào /var/www/gioithieu
sudo tee /etc/caddy/sites/gioithieu.caddy > /dev/null <<'EOF'
www.tenmien.com {
	root * /var/www/gioithieu
	file_server
}
EOF
sudo systemctl reload caddy
```

Thêm một ứng dụng Node khác thì cho nó chạy ở cổng khác (VD 3001) rồi:

```
sudo tee /etc/caddy/sites/app2.caddy > /dev/null <<'EOF'
app2.tenmien.com {
	reverse_proxy 127.0.0.1:3001
}
EOF
sudo systemctl reload caddy
```

**Cần bao nhiêu RAM:** hệ thống này chạy tốn khoảng 150–250MB. Trang tĩnh gần
như không tốn gì. WordPress kèm MySQL tốn 400–700MB. Vậy VPS 1GB đủ cho hệ
thống này + vài trang tĩnh; muốn thêm một ứng dụng Node hay WordPress nữa thì
nên lên 2GB.

**Khi nào nên tách riêng VPS:** khi một web quan trọng tới mức không được phép
sập lây — vì chung máy nghĩa là chung số phận: một web ngốn hết RAM hoặc bị
tấn công là web kia cũng ảnh hưởng. Với quy mô một trung tâm dạy nhạc, gom
chung một VPS là hợp lý và tiết kiệm.

**Lưu ý khi build:** lệnh cập nhật có bước build khá ngốn RAM, chạy lúc ít
người dùng, và nên tạo sẵn swap (xem bảng lỗi ở trên) nếu VPS chỉ 1GB.

## Bảo mật tối thiểu nên làm

1. Đổi mật khẩu admin ngay lần đăng nhập đầu.
2. Không đưa link cho người ngoài — đây là dữ liệu cá nhân của khách hàng.
3. Giữ file `/etc/musicnote.env` nguyên vẹn (chứa khoá ký phiên đăng nhập); đổi
   nội dung file này sẽ làm mọi người bị đăng xuất.
