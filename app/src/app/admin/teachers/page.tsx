import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listTeachers, listClasses } from "@/lib/queries";
import { formatVND } from "@/lib/format";
import { parseLanguages, parseSubjects, LANGUAGE_LABELS } from "@/lib/types";
import { IconTeacher } from "@/components/icons";
import {
  Avatar,
  Card,
  CardHeader,
  DetailLink,
  EmptyState,
  PageHeader,
  StatusChip,
  TableShell,
  Th,
} from "@/components/ui";
import NewTeacherForm from "./new-teacher-form";

export default async function TeachersPage() {
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const teachers = listTeachers(true);
  const activeClasses = listClasses({ status: "active" });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Giáo viên"
        subtitle={`${teachers.length} giáo viên trong hệ thống · ${
          teachers.filter((t) => t.active).length
        } đang hoạt động`}
      />

      <Card padded={false}>
        {teachers.length === 0 ? (
          <EmptyState
            icon={<IconTeacher className="w-6 h-6" />}
            title="Chưa có giáo viên nào"
            description="Thêm giáo viên đầu tiên ở biểu mẫu bên dưới."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Giáo viên</Th>
                <Th>Email</Th>
                <Th>SĐT</Th>
                <Th>Chuyên môn</Th>
                <Th>Ngôn ngữ</Th>
                <Th className="text-right">Số lớp</Th>
                {isAdmin && <Th className="text-right">Lương/buổi</Th>}
                <Th>Trạng thái</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {teachers.map((t) => (
                <tr key={t.id} className="hover:bg-ivory-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/teachers/${t.id}`}
                      title="Xem lịch tuần & chi tiết giáo viên"
                      className="flex items-center gap-2.5 font-medium text-ink-900 hover:text-wood-700 whitespace-nowrap"
                    >
                      <Avatar name={t.name} className="w-8 h-8 text-[11px]" />
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{t.email}</td>
                  <td className="px-4 py-3 text-ink-600 tabular">{t.phone || "–"}</td>
                  <td className="px-4 py-3 text-ink-600 whitespace-nowrap">
                    {parseSubjects(t.subjects).join(", ") || "–"}
                  </td>
                  <td className="px-4 py-3 text-ink-600 whitespace-nowrap">
                    {parseLanguages(t.languages)
                      .map((l) => LANGUAGE_LABELS[l])
                      .join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right tabular text-ink-900 font-medium">
                    {activeClasses.filter((c) => c.teacher_id === t.id).length}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right tabular text-ink-700 whitespace-nowrap">
                      {t.pay_per_session ? formatVND(t.pay_per_session) : "–"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <StatusChip tone={t.active ? "mint" : "neutral"}>
                      {t.active ? "Đang hoạt động" : "Ngừng"}
                    </StatusChip>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DetailLink href={`/admin/teachers/${t.id}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      {isAdmin && (
        <Card padded={false} className="max-w-2xl">
          <CardHeader title="Thêm giáo viên mới" icon={<IconTeacher className="w-4.5 h-4.5 text-wood-500" />} />
          <div className="p-5">
            <NewTeacherForm />
          </div>
        </Card>
      )}
    </div>
  );
}
