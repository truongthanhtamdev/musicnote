#!/usr/bin/env bash
#
# Sao lưu file dữ liệu SQLite. Chạy hàng ngày qua /etc/cron.d/musicnote-backup.
#
# Dùng lệnh ".backup" của sqlite3 chứ không copy tay: hệ thống đang chạy có
# thể đang ghi dở, copy tay dễ ra file hỏng không mở lại được.

set -euo pipefail

DB="${DATA_DIR:-/var/lib/musicnote/data}/musicnote.db"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/musicnote}"
KEEP_DAYS="${KEEP_DAYS:-30}"

command -v sqlite3 >/dev/null 2>&1 || {
  echo "Thiếu lệnh sqlite3. Cài bằng: sudo apt-get install -y sqlite3" >&2
  exit 1
}
[ -f "$DB" ] || { echo "Chưa có file dữ liệu $DB - bỏ qua."; exit 0; }

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/musicnote-$(date +%F-%H%M).db"
sqlite3 "$DB" ".backup '$OUT'"
gzip -f "$OUT"
find "$BACKUP_DIR" -name 'musicnote-*.db.gz' -mtime +"$KEEP_DAYS" -delete

echo "Đã sao lưu: $OUT.gz"
