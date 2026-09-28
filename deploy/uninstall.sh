#!/usr/bin/env bash
#
# Gỡ hệ thống khỏi VPS.
#
#   Gỡ, GIỮ lại dữ liệu:   sudo APP_NAME=clienthub bash uninstall.sh
#   Gỡ và XOÁ luôn dữ liệu: sudo APP_NAME=clienthub PURGE=1 bash uninstall.sh
#
# Luôn sao lưu database ra /root trước khi đụng vào bất cứ thứ gì, kể cả khi
# bạn chọn xoá sạch — để còn đường lùi nếu bấm nhầm.

set -euo pipefail

APP_NAME="${APP_NAME:-clienthub}"
PURGE="${PURGE:-0}"
APP_DIR="/opt/$APP_NAME"
DATA_DIR="/var/lib/$APP_NAME/data"
ENV_FILE="/etc/$APP_NAME.env"
SERVICE="$APP_NAME.service"
BACKUP_OUT="/root/$APP_NAME-truoc-khi-go-$(date +%F-%H%M).db"

log() { echo -e "\n\033[1;33m==> $*\033[0m"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Cần chạy bằng quyền root: sudo bash uninstall.sh" >&2
  exit 1
fi

if [ ! -f "/etc/systemd/system/$SERVICE" ] && [ ! -d "$APP_DIR" ]; then
  echo "Không tìm thấy bản cài tên '$APP_NAME'. Kiểm tra lại bằng:" >&2
  echo "  ls /opt && systemctl list-units --type=service | grep -i hub" >&2
  exit 1
fi

log "Sao lưu dữ liệu trước khi gỡ"
if [ -f "$DATA_DIR/musicnote.db" ]; then
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DATA_DIR/musicnote.db" ".backup '$BACKUP_OUT'"
  else
    # Dừng dịch vụ trước rồi mới copy, tránh copy nhằm lúc đang ghi dở.
    systemctl stop "$SERVICE" 2>/dev/null || true
    cp "$DATA_DIR/musicnote.db" "$BACKUP_OUT"
  fi
  gzip -f "$BACKUP_OUT"
  echo "Đã lưu: $BACKUP_OUT.gz"
  echo "Tải về máy bạn bằng lệnh (chạy trên máy tính, không phải trên VPS):"
  echo "  scp root@\$(curl -s --max-time 5 ifconfig.me || echo IP-VPS):$BACKUP_OUT.gz ."
else
  echo "Không thấy file dữ liệu, bỏ qua bước sao lưu."
fi

log "Dừng và tắt dịch vụ"
systemctl stop "$SERVICE" 2>/dev/null || true
systemctl disable --quiet "$SERVICE" 2>/dev/null || true
rm -f "/etc/systemd/system/$SERVICE"
systemctl daemon-reload

log "Gỡ hẹn giờ sao lưu và mã nguồn"
rm -f "/etc/cron.d/$APP_NAME-backup" "/usr/local/bin/$APP_NAME-backup"
rm -f "/etc/caddy/sites/$APP_NAME.caddy"
systemctl reload caddy 2>/dev/null || true
rm -rf "$APP_DIR"

if [ "$PURGE" = "1" ]; then
  log "Xoá dữ liệu và tài khoản dịch vụ (đã có bản sao lưu ở trên)"
  rm -rf "/var/lib/$APP_NAME" "/var/backups/$APP_NAME" "$ENV_FILE"
  userdel -r "$APP_NAME" 2>/dev/null || true
else
  log "Giữ lại dữ liệu"
  echo "Dữ liệu vẫn ở: $DATA_DIR"
  echo "Bản sao lưu cũ vẫn ở: /var/backups/$APP_NAME"
  echo "Cấu hình vẫn ở: $ENV_FILE"
  echo "Cài lại lúc nào cũng được, dữ liệu sẽ dùng lại nguyên vẹn."
fi

echo
echo "=================================================="
echo " Đã gỡ '$APP_NAME'. RAM còn trống:"
free -h | awk '/^Mem:/{print "   " $7 " / " $2}'
echo " Bản sao lưu: $BACKUP_OUT.gz"
echo "=================================================="
