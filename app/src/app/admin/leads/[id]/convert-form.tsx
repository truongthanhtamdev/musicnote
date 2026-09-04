"use client";

import { useActionState } from "react";
import { convertLeadToClassAction } from "@/actions/leads";
import type { FormState } from "@/actions/teachers";
import { DAY_LABELS, DAY_ORDER, PACKAGE_OPTIONS } from "@/lib/types";

const initialState: FormState = {};
const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

export default function ConvertLeadForm({
  leadId,
  defaultName,
  teachers,
}: {
  leadId: number;
  defaultName: string;
  teachers: { id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(convertLeadToClassAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Tên học viên</label>
          <input name="student_name" defaultValue={defaultName} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Người đóng tiền / phụ huynh</label>
          <input name="guardian_name" placeholder="Bỏ trống nếu tự đóng" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Thứ học *</label>
          <select name="day_of_week" defaultValue="1" className={inputClass}>
            {DAY_ORDER.map((d) => (
              <option key={d} value={d}>
                {DAY_LABELS[d]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Giờ bắt đầu *</label>
          <input type="time" name="start_time" required defaultValue="18:00" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Thời lượng (phút)</label>
          <input type="number" name="duration_minutes" defaultValue={60} min={30} step={15} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Trình độ</label>
          <input name="level" placeholder="VD: Mới bắt đầu" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Giáo viên</label>
          <select name="teacher_id" defaultValue="" className={inputClass}>
            <option value="">Xếp sau</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Gói học đăng ký</label>
          <select name="package_total_sessions" defaultValue="" className={inputClass}>
            <option value="">Chưa mua gói</option>
            {PACKAGE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p} tiết
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        {pending ? "Đang tạo lớp..." : "Chốt & tạo lớp học"}
      </button>
    </form>
  );
}
