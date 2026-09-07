import {
  annotateSchedule,
  getPackageProgress,
  listClasses,
  type ClassWithSchedule,
  type PackageProgress,
} from "@/lib/queries";

export type PackageSP = {
  q?: string;
  subject?: string;
  teacherId?: string;
  /** Số tiết của gói (20/50/100), hoặc "none" để xem các lớp chưa đăng ký gói. */
  pkg?: string;
  remaining?: string;
  page?: string;
};

export interface PackageRow {
  cls: ClassWithSchedule;
  /** null khi lớp chưa đăng ký gói học nào. */
  progress: PackageProgress | null;
}

export function listPackageRows(): PackageRow[] {
  return annotateSchedule(listClasses()).map((cls) => ({ cls, progress: getPackageProgress(cls) }));
}

/**
 * Lọc và sắp xếp đúng như trên màn hình, dùng chung cho cả trang và file CSV
 * để file xuất ra luôn khớp với những gì đang xem.
 */
export function filterPackageRows(rows: PackageRow[], sp: PackageSP): PackageRow[] {
  const wantsNoPackage = sp.pkg === "none";
  const q = (sp.q || "").trim().toLowerCase();

  return rows
    .filter(({ cls, progress }) => {
      if (wantsNoPackage ? progress !== null : progress === null) return false;
      if (
        q &&
        !cls.student_name.toLowerCase().includes(q) &&
        !(cls.guardian_name || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      if (sp.subject && cls.subject !== sp.subject) return false;
      if (sp.teacherId && String(cls.teacher_id ?? "") !== sp.teacherId) return false;
      if (!progress) return true;
      if (sp.pkg && !wantsNoPackage && String(progress.total) !== sp.pkg) return false;
      if (sp.remaining && progress.remaining > Number(sp.remaining)) return false;
      return true;
    })
    // Còn ít tiết nhất lên đầu vì đó là lớp cần gia hạn trước. Nhóm chưa có
    // gói thì xếp lớp mới tạo lên đầu — đó là lớp cần điền gói ngay.
    .sort((a, b) =>
      a.progress && b.progress
        ? a.progress.remaining - b.progress.remaining
        : b.cls.created_at.localeCompare(a.cls.created_at)
    );
}
