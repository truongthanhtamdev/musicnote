"use client";

import { useActionState } from "react";
import { updateLeadAction, type LeadFormState } from "@/actions/leads";
import {
  LEAD_LOST_REASON_SUGGESTIONS,
  LEAD_SOURCE_SUGGESTIONS,
  LEAD_STATUS_LABELS,
  LEAD_TEMPERATURE_LABELS,
  LEARNING_MODE_LABELS,
  SUBJECT_SUGGESTIONS,
  type LeadLearningMode,
  type LeadRow,
  type LeadStatus,
  type LeadTemperature,
} from "@/lib/types";

const initialState: LeadFormState = {};
const inputClass = "input";

export default function EditLeadForm({
  lead,
  staff,
}: {
  lead: LeadRow;
  staff: { id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(updateLeadAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={lead.id} />

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="label">Tên khách hàng *</label>
          <input name="name" required defaultValue={lead.name} className={inputClass} />
        </div>
        <div>
          <label className="label">SĐT Zalo</label>
          <input name="phone" defaultValue={lead.phone || ""} className={inputClass} />
        </div>
        <div>
          <label className="label">Tên Facebook</label>
          <input name="fb_name" defaultValue={lead.fb_name || ""} className={inputClass} />
        </div>
        <div>
          <label className="label">Link Facebook</label>
          <input name="fb_url" defaultValue={lead.fb_url || ""} className={inputClass} />
        </div>
        <div>
          <label className="label">Khu vực</label>
          <input name="area" defaultValue={lead.area || ""} className={inputClass} />
        </div>
        <div>
          <label className="label">Môn học</label>
          <select name="subject" defaultValue={lead.subject} className={inputClass}>
            {[...new Set([...SUBJECT_SUGGESTIONS, lead.subject])].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Hình thức học</label>
          <select name="learning_mode" defaultValue={lead.learning_mode} className={inputClass}>
            {(Object.keys(LEARNING_MODE_LABELS) as LeadLearningMode[]).map((m) => (
              <option key={m} value={m}>
                {LEARNING_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Nguồn</label>
          <input
            name="source"
            list="lead-source-options-edit"
            defaultValue={lead.source}
            className={inputClass}
          />
          <datalist id="lead-source-options-edit">
            {LEAD_SOURCE_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label className="label">Nhu cầu cụ thể</label>
        <input name="need" defaultValue={lead.need || ""} className={inputClass} />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="label">Trạng thái</label>
          <select name="status" defaultValue={lead.status} className={inputClass}>
            {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Mức độ tiềm năng</label>
          <select name="temperature" defaultValue={lead.temperature} className={inputClass}>
            {(Object.keys(LEAD_TEMPERATURE_LABELS) as LeadTemperature[]).map((t) => (
              <option key={t} value={t}>
                {LEAD_TEMPERATURE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Người phụ trách</label>
          <select name="owner_id" defaultValue={lead.owner_id ? String(lead.owner_id) : ""} className={inputClass}>
            <option value="">Chưa giao</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ngày nhận lead</label>
          <input type="date" name="received_at" defaultValue={lead.received_at} className={inputClass} />
        </div>
        <div>
          <label className="label">Hẹn liên hệ lại</label>
          <input
            type="date"
            name="next_follow_up"
            defaultValue={lead.next_follow_up || ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className="label">Doanh thu dự kiến (VNĐ)</label>
          <input
            name="expected_value"
            inputMode="numeric"
            defaultValue={lead.expected_value ? String(lead.expected_value) : ""}
            placeholder="VD: 7500000"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="label">Lý do từ chối (nếu có)</label>
        <input
          name="lost_reason"
          list="lead-lost-reasons"
          defaultValue={lead.lost_reason || ""}
          className={inputClass}
        />
        <datalist id="lead-lost-reasons">
          {LEAD_LOST_REASON_SUGGESTIONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="label">Ghi chú chung</label>
        <textarea name="notes" rows={3} defaultValue={lead.notes || ""} className={inputClass} />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Đã lưu thay đổi.</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary"
      >
        {pending ? "Đang lưu..." : "Lưu thông tin"}
      </button>
    </form>
  );
}
