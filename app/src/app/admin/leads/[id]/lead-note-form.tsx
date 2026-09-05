"use client";

import { useActionState, useState } from "react";
import { addLeadNoteAction } from "@/actions/leads";
import type { FormState } from "@/actions/teachers";
import { LEAD_NOTE_KIND_LABELS, type LeadNoteKind } from "@/lib/types";

const initialState: FormState = {};
const inputClass = "input";
const KINDS: LeadNoteKind[] = ["call", "message", "appointment", "note"];

export default function LeadNoteForm({ leadId }: { leadId: number }) {
  const [state, formAction, pending] = useActionState(addLeadNoteAction, initialState);
  const [formKey, setFormKey] = useState(0);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setFormKey((k) => k + 1);
  }

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Hình thức</label>
          <select name="kind" defaultValue="call" className={inputClass}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {LEAD_NOTE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Hẹn liên hệ lại</label>
          <input type="date" name="next_follow_up" className={inputClass} />
        </div>
      </div>
      <textarea
        name="body"
        rows={2}
        required
        placeholder="VD: Đã gọi, chị bận, hẹn gọi lại tối mai. Quan tâm gói 20 tiết tại nhà."
        className={inputClass}
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary"
      >
        {pending ? "Đang lưu..." : "Ghi nhận trao đổi"}
      </button>
    </form>
  );
}
