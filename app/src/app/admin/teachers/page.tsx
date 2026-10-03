import { getSession } from "@/lib/auth";
import { requireRole } from "@/lib/guard";
import { listTeachers, listClasses } from "@/lib/queries";
import { parseLanguages, parseSubjects, MANAGE_ROLES } from "@/lib/types";
import { IconTeacher } from "@/components/icons";
import { btn, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import NewTeacherForm from "./new-teacher-form";
import TeacherTable, { type TeacherLine } from "./teacher-table";

export default async function TeachersPage() {
  // Trang lớp học: nhân viên đặt hẹn không vào, chỉ Quản lý trở lên.
  await requireRole(MANAGE_ROLES);
  const session = await getSession();
  // Quản lý được tạo tài khoản giáo viên và xem mức lương/buổi — chỉ sổ
  // doanh thu là của riêng chủ trung tâm.
  const isAdmin = session?.role === "admin" || session?.role === "manager";
  const teachers = listTeachers(true);
  const activeClasses = listClasses({ status: "active" });
  const lines: TeacherLine[] = teachers.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    phone: t.phone,
    subjects: parseSubjects(t.subjects),
    // Nhãn ngắn trong bảng: "Tiếng Việt, Tiếng Anh" chiếm gần 100px mỗi dòng.
    languages: parseLanguages(t.languages).map((l) =>
      l === "en" ? "Anh" : "Việt",
    ),
    classCount: activeClasses.filter((c) => c.teacher_id === t.id).length,
    payPerSession: isAdmin ? t.pay_per_session : null,
    active: !!t.active,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Giáo viên"
        subtitle={`${teachers.length} giáo viên trong hệ thống · ${
          teachers.filter((t) => t.active).length
        } đang hoạt động`}
        action={
          isAdmin && (
            <a href="#them-giao-vien" className={btn.primary}>
              + Thêm giáo viên
            </a>
          )
        }
      />

      <Card padded={false}>
        {teachers.length === 0 ? (
          <EmptyState
            icon={<IconTeacher className="w-6 h-6" />}
            title="Chưa có giáo viên nào"
            description="Thêm giáo viên đầu tiên ở biểu mẫu bên dưới."
          />
        ) : (
          <TeacherTable teachers={lines} isAdmin={isAdmin} />
        )}
      </Card>

      {isAdmin && (
        <div id="them-giao-vien" className="scroll-mt-20">
          <Card padded={false} className="max-w-2xl">
            <CardHeader
              title="Thêm giáo viên mới"
              icon={<IconTeacher className="w-4.5 h-4.5 text-wood-500" />}
            />
            <div className="p-5">
              <NewTeacherForm />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
