import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listTeachers } from "@/lib/queries";
import { formatVND } from "@/lib/format";
import { parseLanguages, LANGUAGE_LABELS } from "@/lib/types";
import NewTeacherForm from "./new-teacher-form";

export default async function TeachersPage() {
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const teachers = listTeachers(true);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Giáo viên ({teachers.length})</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">Tên</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">SĐT</th>
                <th className="px-4 py-2.5 font-medium">Ngôn ngữ</th>
                {isAdmin && <th className="px-4 py-2.5 font-medium">Lương/buổi</th>}
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{t.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{t.email}</td>
                  <td className="px-4 py-2.5 text-slate-600">{t.phone || "-"}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {parseLanguages(t.languages).map((l) => LANGUAGE_LABELS[l]).join(", ")}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-slate-600">
                      {t.pay_per_session ? formatVND(t.pay_per_session) : "-"}
                    </td>
                  )}
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        t.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {t.active ? "Đang hoạt động" : "Ngừng"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/admin/teachers/${t.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Chưa có giáo viên nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-lg">
          <h2 className="font-semibold text-slate-900 mb-3">Thêm giáo viên mới</h2>
          <NewTeacherForm />
        </div>
      )}
    </div>
  );
}
