"use client";

import { useActionState, useState } from "react";
import { createAppointmentAction, type AppointmentFormState } from "@/actions/appointments";
import {
  APPOINTMENT_KIND_DEFAULT_DURATION,
  APPOINTMENT_KIND_LABELS,
  REMIND_OPTIONS,
  type AppointmentKind,
} from "@/lib/types";

const initialState: AppointmentFormState = {};

export default function AppointmentForm({
  leadId,
  leads,
  defaultDate,
  compact,
}: {
  /** Đặt lịch cho đúng một khách (dùng ở trang chi tiết khách). */
  leadId?: number;
  /** Danh sách khách để chọn, khi đặt lịch từ màn hình Hôm nay. */
  leads?: { id: number; name: string; phone: string | null }[];
  defaultDate: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(createAppointmentAction, initialState);
  const [kind, setKind] = useState<AppointmentKind>("call");
  const [formKey, setFormKey] = useState(0);

  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.success) setFormKey((k) => k + 1);
  }

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      {leadId && <input type="hidden" name="lead_id" value={leadId} />}
      {state.conflict && <input type="hidden" name="force" value="1" />}

      {!leadId && leads && (
        <div>
          <label className="label">Khách hàng</label>
          <select name="lead_id" defaultValue="" className="input">
            <option value="">Không gắn khách cụ thể</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.phone ? ` — ${l.phone}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={`grid gap-3 ${compact ? "grid-cols-2" : "md:grid-cols-4"}`}>
        <div>
          <label className="label">Loại hẹn</label>
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as AppointmentKind)}
            className="input"
          >
            {(Object.keys(APPOINTMENT_KIND_LABELS) as AppointmentKind[]).map((k) => (
              <option key={k} value={k}>
                {APPOINTMENT_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ngày *</label>
          <input type="date" name="date" required defaultValue={defaultDate} className="input" />
        </div>
        <div>
          <label className="label">Giờ *</label>
          <input type="time" name="time" required defaultValue="19:00" className="input" />
        </div>
        <div>
          <label className="label">Kéo dài (phút)</label>
          <input
            type="number"
            name="duration_minutes"
            min={5}
            step={5}
            // Đổi loại hẹn thì thời lượng mặc định đổi theo, nên dùng key để
            // ô nhập lấy lại giá trị gợi ý.
            key={kind}
            defaultValue={APPOINTMENT_KIND_DEFAULT_DURATION[kind]}
            className="input"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label">Nhắc trước</label>
          <select name="remind_minutes" defaultValue="30" className="input">
            {REMIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Địa điểm</label>
          <input
            name="location"
            placeholder="VD: nhà khách Q7 / Zoom / quán cà phê Highlands"
            className="input"
          />
        </div>
      </div>

      {!leadId && (
        <div>
          <label className="label">Tiêu đề (khi không gắn khách)</label>
          <input name="title" placeholder="VD: Họp với giáo viên" className="input" />
        </div>
      )}

      <div>
        <label className="label">Ghi chú</label>
        <input name="note" placeholder="VD: khách hỏi giá gói 20 tiết" className="input" />
      </div>

      {state.error && <p className="text-[13px] text-rose-600">{state.error}</p>}
      {state.conflict && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          {state.conflict}
        </p>
      )}
      {state.success && <p className="text-[13px] text-brand-600">Đã đặt lịch và bật nhắc việc.</p>}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Đang lưu..." : state.conflict ? "Vẫn đặt lịch này" : "Đặt lịch hẹn"}
      </button>
    </form>
  );
}
