"use client";

import { useActionState, useEffect, useRef } from "react";
import { createStaffAction, type FormState } from "@/actions/teachers";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

export default function NewStaffForm({ canCreateAdmin }: { canCreateAdmin: boolean }) {
  const [state, formAction, pending] = useActionState(createStaffAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <label className={label} htmlFor="staff-name">
          Họ tên
        </label>
        <input id="staff-name" name="name" required className={field} placeholder="Nguyễn Văn A" />
      </div>
      <div>
        <label className={label} htmlFor="staff-email">
          Email đăng nhập
        </label>
        <input
          id="staff-email"
          name="email"
          type="email"
          required
          className={field}
          placeholder="ten@email.com"
        />
      </div>
      <div>
        <label className={label} htmlFor="staff-password">
          Mật khẩu tạm
        </label>
        <input
          id="staff-password"
          name="password"
          type="password"
          required
          minLength={6}
          className={field}
          placeholder="Ít nhất 6 ký tự"
        />
      </div>
      <div>
        <label className={label} htmlFor="staff-role">
          Vai trò
        </label>
        <select id="staff-role" name="role" defaultValue="coordinator" className={field}>
          <option value="coordinator">Giáo vụ — xếp lớp, chăm khách</option>
          <option value="manager">Quản lý — thêm quyền nhân sự và cài đặt</option>
          {/* Chỉ chủ trung tâm mới thấy lựa chọn này; máy chủ cũng chặn lại
              lần nữa, vì ai cũng sửa được HTML trong trình duyệt. */}
          {canCreateAdmin && <option value="admin">Chủ trung tâm — toàn quyền</option>}
        </select>
      </div>

      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
      {state.success && <p className="text-sm text-mint-600">Đã tạo tài khoản.</p>}

      <button type="submit" disabled={pending} className={btn.primary}>
        {pending ? "Đang lưu…" : "Tạo tài khoản"}
      </button>
    </form>
  );
}
