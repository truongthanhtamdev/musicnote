"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createLeadAction, type LeadFormState } from "@/actions/leads";
import { todayISO } from "@/lib/format";
import {
  LEAD_SOURCE_SUGGESTIONS,
  LEARNING_MODE_LABELS,
  SUBJECT_SUGGESTIONS,
  type LeadLearningMode,
} from "@/lib/types";

const initialState: LeadFormState = {};

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

export default function NewLeadForm({
  staff,
  currentUserId,
}: {
  staff: { id: number; name: string }[];
  currentUserId: number;
}) {
  const [state, formAction, pending] = useActionState(createLeadAction, initialState);
  const [formKey, setFormKey] = useState(0);

  // Sau khi lưu xong thì dựng lại form (đổi key) để xoá sạch các ô đã nhập —
  // giáo vụ thường nhập liên tiếp nhiều lead một lúc.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setFormKey((k) => k + 1);
  }

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      {/* Bấm "Vẫn lưu" khi cảnh báo trùng SĐT là người khác thật. */}
      {state.duplicate && <input type="hidden" name="force" value="1" />}

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Tên khách hàng *</label>
          <input name="name" required placeholder="VD: Chị Lan" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">SĐT Zalo</label>
          <input name="phone" inputMode="tel" placeholder="09xx xxx xxx" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Khu vực</label>
          <input name="area" placeholder="VD: Quận 7, Thủ Đức..." className={inputClass} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Tên Facebook</label>
          <input name="fb_name" placeholder="Tên hiển thị trên FB" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Link Facebook / inbox</label>
          <input name="fb_url" placeholder="https://facebook.com/..." className={inputClass} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Môn học</label>
          <select name="subject" defaultValue="Guitar" className={inputClass}>
            {SUBJECT_SUGGESTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Hình thức học</label>
          <select name="learning_mode" defaultValue="home_private" className={inputClass}>
            {(Object.keys(LEARNING_MODE_LABELS) as LeadLearningMode[]).map((m) => (
              <option key={m} value={m}>
                {LEARNING_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Nguồn</label>
          <input
            name="source"
            list="lead-source-options"
            defaultValue="Facebook Ads"
            className={inputClass}
          />
          <datalist id="lead-source-options">
            {LEAD_SOURCE_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Nhu cầu cụ thể</label>
        <input
          name="need"
          placeholder="VD: học đệm hát cho con 12 tuổi, muốn học tối T3-T5"
          className={inputClass}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Ngày nhận lead</label>
          <input type="date" name="received_at" defaultValue={todayISO()} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Hẹn liên hệ lại</label>
          <input type="date" name="next_follow_up" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Người phụ trách</label>
          <select name="owner_id" defaultValue={String(currentUserId)} className={inputClass}>
            <option value="">Chưa giao</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.duplicate && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {state.duplicate}
          {state.leadId && (
            <Link href={`/admin/leads/${state.leadId}`} className="ml-1 underline">
              Mở lead cũ
            </Link>
          )}
        </div>
      )}
      {state.success && <p className="text-sm text-emerald-600">Đã lưu khách hàng tiềm năng.</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-gold-600 hover:bg-gold-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        {pending ? "Đang lưu..." : state.duplicate ? "Vẫn lưu (người khác)" : "Lưu khách hàng"}
      </button>
    </form>
  );
}
