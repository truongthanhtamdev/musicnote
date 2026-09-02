import { requireRole } from "@/lib/guard";
import { listStudents } from "@/lib/queries";
import { IconUser } from "@/components/icons";
import {
  Avatar,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatusChip,
  TableShell,
  Th,
} from "@/components/ui";
import NewStudentForm from "./new-student-form";
import ToggleStudentActiveButton from "./toggle-active-button";

export default async function StudentsPage() {
  await requireRole(["admin"]);
  const students = listStudents();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tài khoản học viên"
        subtitle="Tạo tài khoản để học viên tự đăng nhập xem lịch học, tiến độ gói và nội dung bài học. Sau khi tạo, vào trang chi tiết lớp để gắn lớp với tài khoản."
      />

      <Card padded={false}>
        {students.length === 0 ? (
          <EmptyState
            icon={<IconUser className="w-6 h-6" />}
            title="Chưa có tài khoản học viên nào"
            description="Tạo tài khoản đầu tiên ở biểu mẫu bên dưới."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Học viên</Th>
                <Th>Email / SĐT đăng nhập</Th>
                <Th>SĐT liên hệ</Th>
                <Th>Trạng thái</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-ivory-50">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5 font-medium text-ink-900 whitespace-nowrap">
                      <Avatar name={s.name} className="w-8 h-8 text-[11px]" />
                      {s.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{s.email}</td>
                  <td className="px-4 py-3 text-ink-600 tabular">{s.phone || "–"}</td>
                  <td className="px-4 py-3">
                    <StatusChip tone={s.active ? "mint" : "neutral"}>
                      {s.active ? "Đang hoạt động" : "Ngừng"}
                    </StatusChip>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ToggleStudentActiveButton studentId={s.id} active={!!s.active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <Card padded={false} className="max-w-2xl">
        <CardHeader
          title="Thêm tài khoản học viên"
          icon={<IconUser className="w-4.5 h-4.5 text-wood-500" />}
        />
        <div className="p-5">
          <NewStudentForm />
        </div>
      </Card>
    </div>
  );
}
