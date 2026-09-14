"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { deleteTeacherAction, type FormState } from "@/actions/teachers";
import { foldVietnamese, formatVND } from "@/lib/format";
import { IconSearch, IconTeacher } from "@/components/icons";
import { Avatar, EmptyState, StatusChip, TableShell, Th, field } from "@/components/ui";

export interface TeacherLine {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subjects: string[];
  languages: string[];
  classCount: number;
  payPerSession: number | null;
  active: boolean;
}

/**
 * Danh sách giáo viên, lọc ngay trên máy khi gõ vào ô tìm.
 *
 * Trung tâm đang có vài chục giáo viên nên dò bằng mắt là cực; dữ liệu đã nằm
 * sẵn trên trang nên gõ tới đâu lọc tới đó, không phải gọi lại server. Bỏ dấu
 * khi so nên gõ "thang" vẫn ra "GV THẮNG".
 */
export default function TeacherTable({
  teachers,
  isAdmin,
}: {
  teachers: TeacherLine[];
  isAdmin: boolean;
}) {
  const [q, setQ] = useState("");

  const haystacks = useMemo(
    () =>
      teachers.map((t) =>
        foldVietnamese([t.name, t.email, t.phone ?? "", ...t.subjects].join(" "))
      ),
    [teachers]
  );

  const rows = useMemo(() => {
    const needle = foldVietnamese(q.trim());
    if (!needle) return teachers;
    return teachers.filter((_, i) => haystacks[i].includes(needle));
  }, [teachers, haystacks, q]);

  return (
    <div>
      <div className="p-4 border-b border-navy-100 relative">
        <IconSearch className="w-4 h-4 absolute left-7 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm giáo viên theo tên, email, SĐT hoặc bộ môn..."
          aria-label="Tìm giáo viên"
          className={`${field} pl-9`}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<IconTeacher className="w-6 h-6" />}
          title="Không tìm thấy giáo viên nào"
          description={`Không có ai khớp với "${q}".`}
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
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-ivory-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/teachers/${t.id}`}
                    title="Xem lịch tuần & chi tiết giáo viên"
                    className="flex items-center gap-2.5 font-medium text-ink-900 hover:text-wood-700 max-w-[190px]"
                  >
                    <Avatar name={t.name} className="w-8 h-8 text-[11px] shrink-0" />
                    {t.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-600">
                  <span className="block max-w-[190px] truncate" title={t.email}>
                    {t.email}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-600 tabular">{t.phone || "–"}</td>
                <td className="px-4 py-3 text-ink-600">{t.subjects.join(", ") || "–"}</td>
                <td className="px-4 py-3 text-ink-600 whitespace-nowrap">
                  {t.languages.join(", ")}
                </td>
                <td className="px-4 py-3 text-right tabular text-ink-900 font-medium">
                  {t.classCount}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right tabular text-ink-700 whitespace-nowrap">
                    {t.payPerSession ? formatVND(t.payPerSession) : "–"}
                  </td>
                )}
                <td className="px-4 py-3">
                  <StatusChip tone={t.active ? "mint" : "neutral"}>
                    {t.active ? "Hoạt động" : "Ngừng"}
                  </StatusChip>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    {isAdmin && <DeleteTeacher teacher={t} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

const initialState: FormState = {};

/**
 * Nút xoá của một dòng. Lỗi (VD giáo viên đã có buổi dạy nên không xoá được)
 * hiện ngay dưới nút, khỏi phải dò lên đầu bảng tìm thông báo.
 */
function DeleteTeacher({ teacher }: { teacher: TeacherLine }) {
  const [state, formAction, pending] = useActionState(deleteTeacherAction, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const warning =
          teacher.classCount > 0
            ? `Xoá giáo viên ${teacher.name}? ${teacher.classCount} lớp đang dạy sẽ chuyển về "Chưa xếp giáo viên".`
            : `Xoá giáo viên ${teacher.name}?`;
        if (!confirm(warning)) e.preventDefault();
      }}
    >
      <input type="hidden" name="teacher_id" value={teacher.id} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm border border-coral-100 text-coral-600 hover:bg-coral-50 rounded-lg px-2.5 py-1 disabled:opacity-50"
      >
        {pending ? "..." : "Xoá"}
      </button>
      {state.error && (
        <p className="mt-1 text-xs text-coral-600 text-left max-w-[260px] whitespace-normal">
          {state.error}
        </p>
      )}
    </form>
  );
}
