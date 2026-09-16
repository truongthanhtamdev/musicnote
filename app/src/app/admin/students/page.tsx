import { requireRole } from "@/lib/guard";
import { listAccountCandidates, listClassCodesByStudent, listStudents } from "@/lib/queries";
import { IconUser, IconUsers } from "@/components/icons";
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
import ResetPasswordButton from "@/components/reset-password-button";
import BulkAccounts from "./bulk-accounts";
import NewStudentForm from "./new-student-form";
import ToggleStudentActiveButton from "./toggle-active-button";

export default async function StudentsPage() {
  await requireRole(["admin"]);
  const students = listStudents();
  const candidates = listAccountCandidates();
  const codesByStudent = listClassCodesByStudent();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tài khoản học viên"
        subtitle="Tạo tài khoản để học viên tự đăng nhập xem lịch học, tiến độ gói và nội dung bài học. Sau khi tạo, vào trang chi tiết lớp để gắn lớp với tài khoản. Khách quên mật khẩu thì bấm Đặt lại mật khẩu ngay ở dòng của khách."
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
                <Th>Đăng nhập bằng</Th>
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
                  <td className="px-4 py-3 text-ink-600">
                    <span className="tabular">{s.email}</span>
                    {codesByStudent.get(s.id)?.length ? (
                      <span className="block text-xs text-ink-400 mt-0.5">
                        Mã lớp: {codesByStudent.get(s.id)!.join(", ")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-ink-600 tabular">{s.phone || "–"}</td>
                  <td className="px-4 py-3">
                    <StatusChip tone={s.active ? "mint" : "neutral"}>
                      {s.active ? "Đang hoạt động" : "Ngừng"}
                    </StatusChip>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                      <ResetPasswordButton userId={s.id} />
                      <ToggleStudentActiveButton studentId={s.id} active={!!s.active} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <Card padded={false}>
        <CardHeader
          title="Tạo tài khoản hàng loạt từ lớp đang học"
          count={candidates.filter((c) => c.status === "ok").length || undefined}
          icon={<IconUsers className="w-4.5 h-4.5 text-wood-500" />}
        />
        <div className="p-5">
          <BulkAccounts candidates={candidates} />
        </div>
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
