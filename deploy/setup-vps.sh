#!/usr/bin/env bash
#
# Cài đặt hệ thống quản lý trung tâm lên VPS Ubuntu (22.04 / 24.04).
#
#   Có tên miền:    sudo bash setup-vps.sh quanly.tenmien.com
#   Chưa có tên miền: sudo bash setup-vps.sh
#
# Chạy lại nhiều lần được: lần sau chỉ cập nhật mã nguồn và khởi động lại,
# không tạo lại mật khẩu phiên đăng nhập và không đụng tới dữ liệu.

set -euo pipefail

DOMAIN="${1:-}"
REPO="${REPO:-https://github.com/truongthanhtamdev/musicnote.git}"
BRANCH="${BRANCH:-claude/facebook-customer-management-nd4rys}"
APP_USER=musicnote
APP_DIR=/opt/musicnote
DATA_DIR=/var/lib/musicnote/data
BACKUP_DIR=/var/backups/musicnote
ENV_FILE=/etc/musicnote.env
PORT="${PORT:-3000}"

log() { echo -e "\n\033[1;33m==> $*\033[0m"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Cần chạy bằng quyền root: sudo bash setup-vps.sh [tên-miền]" >&2
  exit 1
fi

log "Cài các gói cơ bản"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ca-certificates gnupg sqlite3 ufw

# Next.js 16 cần Node 20 trở lên; Ubuntu đóng gói sẵn bản quá cũ nên lấy từ NodeSource.
NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  if [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]; then NEED_NODE=0; fi
fi
if [ "$NEED_NODE" -eq 1 ]; then
  log "Cài Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs
fi
echo "Node.js: $(node -v)"

log "Tạo tài khoản chạy dịch vụ và các thư mục"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/$APP_USER --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR" "$DATA_DIR" "$BACKUP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR" "$(dirname "$DATA_DIR")" "$BACKUP_DIR"

log "Tải mã nguồn (nhánh $BRANCH)"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
  sudo -u "$APP_USER" git -C "$APP_DIR" checkout --quiet -B "$BRANCH" "origin/$BRANCH"
else
  sudo -u "$APP_USER" git clone --quiet --branch "$BRANCH" "$REPO" "$APP_DIR"
fi
echo "Phiên bản: $(git -C "$APP_DIR" log --oneline -1)"

# Mật khẩu ký phiên đăng nhập: tạo một lần rồi giữ nguyên mãi. Đổi chuỗi này
# sẽ làm mọi người đang đăng nhập bị văng ra.
if [ ! -f "$ENV_FILE" ]; then
  log "Tạo file cấu hình $ENV_FILE"
  SECRET="$(openssl rand -base64 48 | tr -d '\n')"
  HOST_BIND="127.0.0.1"
  [ -z "$DOMAIN" ] && HOST_BIND="0.0.0.0"
  cat > "$ENV_FILE" <<ENVEOF
AUTH_SECRET=$SECRET
DATA_DIR=$DATA_DIR
PORT=$PORT
HOSTNAME=$HOST_BIND
ENVEOF
  chmod 600 "$ENV_FILE"
else
  echo "Đã có $ENV_FILE, giữ nguyên."
fi

log "Cài thư viện và build (mất vài phút)"
cd "$APP_DIR/app"
sudo -u "$APP_USER" npm ci --no-audit --no-fund
sudo -u "$APP_USER" env DATA_DIR="$DATA_DIR" npm run build

# Bản build "standalone" không tự kèm ảnh và file tĩnh — phải chép vào.
sudo -u "$APP_USER" cp -r public .next/standalone/public
sudo -u "$APP_USER" mkdir -p .next/standalone/.next
sudo -u "$APP_USER" cp -r .next/static .next/standalone/.next/static

log "Tạo dịch vụ tự khởi động musicnote.service"
cat > /etc/systemd/system/musicnote.service <<UNITEOF
[Unit]
Description=Musicnote - he thong quan ly trung tam nhac
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR/app/.next/standalone
EnvironmentFile=$ENV_FILE
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=$(dirname "$DATA_DIR")

[Install]
WantedBy=multi-user.target
UNITEOF
systemctl daemon-reload
systemctl enable --quiet musicnote
systemctl restart musicnote

log "Hẹn giờ sao lưu dữ liệu hàng ngày (03:15 sáng, giữ 30 bản)"
install -m 755 "$APP_DIR/deploy/backup.sh" /usr/local/bin/musicnote-backup
cat > /etc/cron.d/musicnote-backup <<CRONEOF
15 3 * * * root /usr/local/bin/musicnote-backup >/dev/null 2>&1
CRONEOF

log "Bật tường lửa"
ufw allow OpenSSH >/dev/null
if [ -n "$DOMAIN" ]; then
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
else
  ufw allow "$PORT"/tcp >/dev/null
fi
ufw --force enable >/dev/null

if [ -n "$DOMAIN" ]; then
  log "Cài Caddy và bật HTTPS cho $DOMAIN"
  if ! command -v caddy >/dev/null 2>&1; then
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
      | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" \
      > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq
    apt-get install -y -qq caddy
  fi
  # Mỗi web một file cấu hình riêng trong /etc/caddy/sites/ để cài thêm web
  # khác lên cùng VPS không ghi đè lẫn nhau.
  mkdir -p /etc/caddy/sites
  if ! grep -q "import /etc/caddy/sites" /etc/caddy/Caddyfile 2>/dev/null; then
    [ -f /etc/caddy/Caddyfile ] && cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak.$(date +%s)
    cat > /etc/caddy/Caddyfile <<'MAINEOF'
# Mỗi web khai báo trong một file riêng ở /etc/caddy/sites/*.caddy
import /etc/caddy/sites/*.caddy
MAINEOF
  fi
  cat > /etc/caddy/sites/musicnote.caddy <<CADDYEOF
$DOMAIN {
	reverse_proxy 127.0.0.1:$PORT
}
CADDYEOF
  caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1 || echo "(!) Caddyfile có lỗi, kiểm tra: caddy validate --config /etc/caddy/Caddyfile"
  systemctl reload caddy 2>/dev/null || systemctl restart caddy
fi

sleep 3
systemctl is-active --quiet musicnote && STATUS="đang chạy" || STATUS="LỖI - xem: journalctl -u musicnote -n 50"

echo
echo "=================================================="
echo " Cài đặt xong. Dịch vụ: $STATUS"
if [ -n "$DOMAIN" ]; then
  echo " Địa chỉ:      https://$DOMAIN"
  echo " (Tên miền phải đã trỏ bản ghi A về IP của VPS này)"
else
  echo " Địa chỉ:      http://$(curl -s --max-time 5 ifconfig.me || echo 'IP-VPS'):$PORT"
fi
echo " Đăng nhập:    admin@musicnote.local / admin123  (đổi ngay!)"
echo " Dữ liệu:      $DATA_DIR/musicnote.db"
echo " Sao lưu:      $BACKUP_DIR (tự chạy 3h15 sáng mỗi ngày)"
echo
echo " Cập nhật sau này:  sudo bash $APP_DIR/deploy/update.sh"
echo " Xem log:           journalctl -u musicnote -f"
echo "=================================================="
