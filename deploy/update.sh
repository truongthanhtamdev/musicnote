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
BACKUP_BIN="/usr/local/bin/$APP_NAME-backup"
BRANCH="${BRANCH:-$(git -C "$APP_DIR" rev-parse --abbrev-ref HEAD)}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Cần chạy bằng quyền root: sudo bash update.sh" >&2
  exit 1
fi

echo "==> Sao lưu dữ liệu trước khi cập nhật"
DATA_DIR="$DATA_DIR" "$BACKUP_BIN" || echo "(bỏ qua: chưa cài script sao lưu)"

echo "==> Tải mã nguồn mới cho $APP_NAME (nhánh $BRANCH)"
sudo -u "$APP_USER" git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
sudo -u "$APP_USER" git -C "$APP_DIR" checkout --quiet -B "$BRANCH" "origin/$BRANCH"
git -C "$APP_DIR" log --oneline -1

echo "==> Cài thư viện và build"
cd "$APP_DIR/app"
sudo -u "$APP_USER" npm ci --no-audit --no-fund
sudo -u "$APP_USER" env DATA_DIR="$DATA_DIR" npm run build
sudo -u "$APP_USER" rm -rf .next/standalone/public .next/standalone/.next/static
sudo -u "$APP_USER" cp -r public .next/standalone/public
sudo -u "$APP_USER" mkdir -p .next/standalone/.next
sudo -u "$APP_USER" cp -r .next/static .next/standalone/.next/static

echo "==> Khởi động lại dịch vụ"
systemctl restart "$SERVICE"
sleep 3
systemctl is-active --quiet "$SERVICE" \
  && echo "Xong. Dịch vụ đang chạy." \
  || { echo "LỖI - xem log:"; journalctl -u "$SERVICE" -n 30 --no-pager; exit 1; }
