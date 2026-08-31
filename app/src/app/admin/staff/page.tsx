import { requireRole } from "@/lib/guard";
import { listStaff } from "@/lib/queries";
import NewCoordinatorForm from "./new-coordinator-form";
import ResetPasswordButton from "@/components/reset-password-button";

export default async function StaffPage() {
  await requireRole(["admin"]);
  const staff = listStaff();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Nhân sự quản lý</h1>
        <p className="text-slate-500 text-sm mt-1">
          Admin có toàn quyền. Giáo vụ chỉ được xếp lớp và xem báo cáo, không xem/sửa được lương.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Tên</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Vai trò</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2.5 font-medium text-slate-900">{s.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{s.email}</td>
                <td className="px-4 py-2.5 text-slate-600">
                  {s.role === "admin" ? "Admin" : "Giáo vụ"}
                </td>
                <td className="px-4 py-2.5">
                  <ResetPasswordButton userId={s.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-lg">
        <h2 className="font-semibold text-slate-900 mb-3">Thêm giáo vụ</h2>
        <NewCoordinatorForm />
      </div>
    </div>
  );
}
