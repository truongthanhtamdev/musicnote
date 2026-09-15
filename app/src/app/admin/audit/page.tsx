import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { listAudit, AUDIT_AREA_LABELS, type AuditArea } from "@/lib/audit";
import { IconSearch } from "@/components/icons";
import {
  Card,
  EmptyState,
  PageHeader,
  StatusChip,
  TableShell,
  Th,
  btn,
  field,
} from "@/components/ui";

const AREA_TONE: Record<AuditArea, "coral" | "amber" | "mint" | "navy" | "neutral"> = {
  diem_danh: "navy",
  hoc_phi: "mint",
  luong: "amber",
  lop_hoc: "coral",
  tai_khoan: "neutral",
  he_thong: "neutral",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Quản trị viên",
  coordinator: "Giáo vụ",
  teacher: "Giáo viên",
  student: "Học viên",
};

/**
 * Ai sửa gì, lúc nào. Trung tâm nhiều người cùng dùng nên khi sổ sách lệch
 * thì đây là chỗ lần ra, thay vì hỏi vòng quanh.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; q?: string }>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const area = (
    Object.keys(AUDIT_AREA_LABELS).includes(sp.area || "") ? sp.area : undefined
  ) as AuditArea | undefined;
  const q = (sp.q || "").trim();
  const rows = listAudit({ area, q: q || undefined });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nhật ký thay đổi"
        subtitle="Những thao tác ảnh hưởng tới sổ sách: điểm danh, học phí, lương, xoá lớp, tài khoản. Lưu lại để khi số liệu lệch thì biết hỏi ai."
      />

      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-sm font-medium text-ink-700 mb-1.5" htmlFor="audit-q">
              Tìm theo nội dung hoặc người làm
            </label>
            <input
              id="audit-q"
              name="q"
              defaultValue={q}
              placeholder="VD: Bé An, thưởng, xoá"
              className={field}
            />
          </div>
          {area && <input type="hidden" name="area" value={area} />}
          <button type="submit" className={btn.primary}>
            <IconSearch className="w-4 h-4" />
            Tìm
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            href={`/admin/audit${q ? `?q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
              area ? "border-navy-200 bg-white text-ink-600" : "border-wood-600 bg-wood-600 text-white"
            }`}
          >
            Tất cả
          </Link>
          {(Object.entries(AUDIT_AREA_LABELS) as [AuditArea, string][]).map(([value, text]) => (
            <Link
              key={value}
              href={`/admin/audit?area=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                area === value
                  ? "border-wood-600 bg-wood-600 text-white"
                  : "border-navy-200 bg-white text-ink-600 hover:border-wood-300"
              }`}
            >
              {text}
            </Link>
          ))}
        </div>
      </Card>

      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState
            icon={<IconSearch className="w-6 h-6" />}
            title="Chưa có thao tác nào được ghi lại"
            description="Nhật ký bắt đầu ghi từ lúc cập nhật bản này — các thao tác trước đó không có."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Thời điểm</Th>
                <Th>Người làm</Th>
                <Th>Nhóm</Th>
                <Th>Nội dung</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-ivory-50 align-top">
                  <td className="px-4 py-3 text-ink-600 tabular whitespace-nowrap text-sm">
                    {r.created_at.slice(0, 16)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-medium text-ink-900">{r.user_name}</span>
                    <span className="block text-xs text-ink-400">
                      {ROLE_LABELS[r.role] ?? r.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip tone={AREA_TONE[r.area]}>
                      {AUDIT_AREA_LABELS[r.area] ?? r.area}
                    </StatusChip>
                  </td>
                  <td className="px-4 py-3 text-ink-700 max-w-[520px]">{r.summary}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <p className="text-xs text-ink-400">
        Hiện tối đa 300 dòng gần nhất. Nhật ký nằm trong cùng file dữ liệu nên đã được sao lưu
        hằng ngày cùng mọi thứ khác.
      </p>
    </div>
  );
}
