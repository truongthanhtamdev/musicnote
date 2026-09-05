#!/usr/bin/env bash
#
# Cập nhật hệ thống lên mã nguồn mới nhất rồi khởi động lại.
#   sudo bash /opt/musicnote/deploy/update.sh
#
# Không đụng tới dữ liệu (nằm ở /var/lib/musicnote/data) và không đổi
# AUTH_SECRET, nên không ai bị văng khỏi phiên đăng nhập.

set -euo pipefail

# Suy ra bản cài từ chính vị trí file này (/opt/<ten>/deploy/update.sh), nhờ
# vậy cập nhật đúng bản đang chạy khi trên VPS có nhiều bản cài khác nhau.
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="$(basename "$APP_DIR")"
APP_USER="$APP_NAME"
DATA_DIR="/var/lib/$APP_NAME/data"
SERVICE="$APP_NAME.service"
as_app() { sudo -u "$APP_USER" -H env "HOME=/home/$APP_USER" "$@"; }
BACKUP_BIN="/usr/local/bin/$APP_NAME-backup"
if [ "$(id -u)" -ne 0 ]; then
  echo "Cần chạy bằng quyền root: sudo bash update.sh" >&2
  exit 1
fi

# git từ chối đọc kho mã thuộc tài khoản khác ("dubious ownership"). Khai báo
# thư mục này là tin cậy cho root, nếu không lệnh lấy tên nhánh ngay bên dưới
# sẽ lỗi và script chết trước khi cập nhật được gì.
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

BRANCH="${BRANCH:-$(as_app git -C "$APP_DIR" rev-parse --abbrev-ref HEAD)}"

echo "==> Sao lưu dữ liệu trước khi cập nhật"
DATA_DIR="$DATA_DIR" "$BACKUP_BIN" || echo "(bỏ qua: chưa cài script sao lưu)"

echo "==> Tải mã nguồn mới cho $APP_NAME (nhánh $BRANCH)"
as_app git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
as_app git -C "$APP_DIR" checkout --quiet -B "$BRANCH" "origin/$BRANCH"
git -C "$APP_DIR" log --oneline -1

echo "==> Cài thư viện và build"
cd "$APP_DIR/app"
as_app npm ci --no-audit --no-fund
as_app env DATA_DIR="$DATA_DIR" npm run build
rm -rf .next/standalone/public .next/standalone/.next/static
as_app cp -r public .next/standalone/public
as_app mkdir -p .next/standalone/.next
as_app cp -r .next/static .next/standalone/.next/static

echo "==> Khởi động lại dịch vụ"
systemctl restart "$SERVICE"
sleep 3
systemctl is-active --quiet "$SERVICE" \
  && echo "Xong. Dịch vụ đang chạy." \
  || { echo "LỖI - xem log:"; journalctl -u "$SERVICE" -n 30 --no-pager; exit 1; }
