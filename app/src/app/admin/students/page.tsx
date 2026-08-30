import { requireRole } from "@/lib/guard";
import { listStudents } from "@/lib/queries";
import NewStudentForm from "./new-student-form";
import ToggleStudentActiveButton from "./toggle-active-button";

export default async function StudentsPage() {
  await requireRole(["admin"]);
  const students = listStudents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Học viên ({students.length})</h1>
        <p className="text-slate-500 text-sm mt-1">
          Tạo tài khoản để học viên tự đăng nhập xem lịch học, tiến độ gói học và nội dung bài học.
          Sau khi tạo, vào trang chi tiết lớp học để gắn lớp với tài khoản này.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Tên</th>
              <th className="px-4 py-2.5 font-medium">Email/SĐT đăng nhập</th>
              <th className="px-4 py-2.5 font-medium">SĐT</th>
              <th className="px-4 py-2.5 font-medium">Trạng thái</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-900">{s.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{s.email}</td>
                <td className="px-4 py-2.5 text-slate-600">{s.phone || "-"}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.active ? "Đang hoạt động" : "Ngừng"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <ToggleStudentActiveButton studentId={s.id} active={!!s.active} />
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Chưa có tài khoản học viên nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-lg">
        <h2 className="font-semibold text-slate-900 mb-3">Thêm tài khoản học viên</h2>
        <NewStudentForm />
      </div>
    </div>
  );
}
