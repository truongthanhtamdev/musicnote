import { requireRole } from "@/lib/guard";
import { listBackups, formatBytes, BACKUP_DIR, KEEP_BACKUPS } from "@/lib/backup";
import { todayISO } from "@/lib/format";
import { IconAlert, IconCheckCircle, IconDownload, IconPackage } from "@/components/icons";
import { Banner, Card, CardHeader, EmptyState, PageHeader, TableShell, Th, btn } from "@/components/ui";
import RunBackupButton from "./run-backup-button";

export default async function BackupPage() {
  await requireRole(["admin"]);

  const backups = listBackups();
  const latest = backups[0];
  const hasToday = latest ? latest.createdAt.toISOString().slice(0, 10) === todayISO() : false;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sao lưu & xuất dữ liệu"
        subtitle="Tải toàn bộ dữ liệu (giáo viên, lớp học, điểm danh, học phí) về máy thành 1 file, và xem các bản sao lưu tự động hàng ngày trên máy chủ."
      />

      {hasToday ? (
        <Banner tone="mint" icon={<IconCheckCircle className="w-5 h-5" />} title="Đã có bản sao lưu hôm nay">
          Bản mới nhất: {latest.name} · {formatBytes(latest.bytes)}
        </Banner>
      ) : (
        <Banner tone="amber" icon={<IconAlert className="w-5 h-5" />} title="Chưa có bản sao lưu hôm nay">
          {latest
            ? `Bản gần nhất là ${latest.name}. Bấm "Sao lưu ngay" bên dưới, hoặc kiểm tra lại lịch cron trên máy chủ.`
            : "Chưa có bản sao lưu nào. Bấm \"Sao lưu ngay\" để tạo bản đầu tiên."}
        </Banner>
      )}

      <Card padded={false}>
        <CardHeader title="Tải dữ liệu về máy" icon={<IconDownload className="w-5 h-5 text-wood-500" />} />
        <div className="p-5">
          <p className="text-sm text-ink-500">
            File .db chứa toàn bộ dữ liệu (giáo viên, lớp học, điểm danh, học phí) — giữ ở máy bạn
            hoặc Google Drive để phòng khi máy chủ có sự cố.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <a href="/admin/backup/download" className={btn.primary}>
              <IconDownload className="w-4 h-4" />
              Tải dữ liệu mới nhất về máy
            </a>
            <RunBackupButton />
          </div>
          <p className="text-xs text-ink-400 mt-3">
            Muốn mở xem nội dung file, dùng phần mềm &quot;DB Browser for SQLite&quot; (miễn phí).
            Khôi phục: chép file này đè lên{" "}
            <code className="text-ink-600">data/musicnote.db</code> trên máy chủ rồi khởi động lại
            app.
          </p>
        </div>
      </Card>

      <Card padded={false}>
        <CardHeader title="Bản sao lưu tự động trên máy chủ" count={backups.length} />
        <p className="text-xs text-ink-400 px-5 pt-3">
          Chạy tự động mỗi đêm, giữ lại {KEEP_BACKUPS} bản gần nhất tại{" "}
          <code className="text-ink-600">{BACKUP_DIR}</code>
        </p>
        {backups.length === 0 ? (
          <EmptyState
            icon={<IconPackage className="w-6 h-6" />}
            title="Chưa có bản sao lưu tự động nào"
            description="Cài lịch cron theo hướng dẫn trong README, hoặc bấm Sao lưu ngay ở trên."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Tên file</Th>
                <Th>Ngày tạo</Th>
                <Th className="text-right">Dung lượng</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {backups.map((b) => (
                <tr key={b.name} className="hover:bg-ivory-50">
                  <td className="px-4 py-3 font-medium text-ink-900">{b.name}</td>
                  <td className="px-4 py-3 text-ink-600 tabular whitespace-nowrap">
                    {b.createdAt.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-right tabular text-ink-700">
                    {formatBytes(b.bytes)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/admin/backup/download?file=${encodeURIComponent(b.name)}`}
                      className="text-wood-600 hover:underline font-medium whitespace-nowrap"
                    >
                      Tải về
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
