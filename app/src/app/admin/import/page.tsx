import { getSession } from "@/lib/auth";
import TeachersImportForm from "./teachers-import-form";
import ClassesImportForm from "./classes-import-form";
import LeadsImportForm from "./leads-import-form";

export default async function ImportPage() {
  const session = await getSession();
  const isAdmin = session?.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Nhập dữ liệu hàng loạt</h1>
        <p className="text-slate-500 text-sm mt-1">
          Dùng khi cần đưa nhiều giáo viên/lớp học/khách hàng tiềm năng có sẵn (VD từ Excel, file
          Facebook Lead Ads) vào hệ thống một lần,
          thay vì thêm tay từng dòng.
        </p>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Nhập giáo viên từ CSV</h2>
            <a
              href="/admin/import/templates/teachers"
              className="text-sm text-brand-600 hover:underline"
            >
              Tải file mẫu
            </a>
          </div>
          <TeachersImportForm />
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Nhập lớp học từ CSV</h2>
          <a
            href="/admin/import/templates/classes"
            className="text-sm text-brand-600 hover:underline"
          >
            Tải file mẫu
          </a>
        </div>
        <ClassesImportForm />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Nhập khách hàng tiềm năng từ CSV</h2>
          <a
            href="/admin/import/templates/leads"
            className="text-sm text-brand-600 hover:underline"
          >
            Tải file mẫu
          </a>
        </div>
        <LeadsImportForm />
      </div>
    </div>
  );
}
