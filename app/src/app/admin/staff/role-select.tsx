"use client";

import { useActionState } from "react";
import { changeStaffRoleAction, type FormState } from "@/actions/teachers";
import type { Role } from "@/lib/types";

const initialState: FormState = {};

/**
 * Ô đổi vai trò ngay trên dòng nhân sự — chọn xong là lưu luôn, không cần nút
 * riêng, vì đây là thao tác một bước và danh sách thường chỉ vài người.
 */
export default function RoleSelect({
  userId,
  role,
  canSetAdmin,
  disabled,
}: {
  userId: number;
  role: Role;
  canSetAdmin: boolean;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(changeStaffRoleAction, initialState);

  if (disabled) return null;

  return (
    <form action={formAction} className="inline-flex flex-col gap-1">
      <input type="hidden" name="user_id" value={userId} />
      <select
        name="role"
        defaultValue={role}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 disabled:opacity-60"
      >
        <option value="coordinator">Giáo vụ</option>
        <option value="manager">Quản lý</option>
        {canSetAdmin && <option value="admin">Chủ trung tâm</option>}
      </select>
      {state.error && <span className="text-xs text-coral-600">{state.error}</span>}
    </form>
  );
}
