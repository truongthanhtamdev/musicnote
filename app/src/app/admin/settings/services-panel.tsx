"use client";

import { useActionState, useState, useTransition } from "react";
import {
  deleteServiceAction,
  saveServiceAction,
  toggleServiceActiveAction,
} from "@/actions/services";
import type { FormState } from "@/actions/teachers";

const initialState: FormState = {};

interface ServiceItem {
  id: number;
  name: string;
  default_owner_id: number | null;
  owner_name: string | null;
  active: number;
  lead_count: number;
}

export default function ServicesPanel({
  kind,
  services,
  staff,
}: {
  kind: "subject" | "fanpage";
  services: ServiceItem[];
  staff: { id: number; name: string }[];
}) {
  const isFanpage = kind === "fanpage";
  const [state, formAction, pending] = useActionState(saveServiceAction, initialState);
  const [busy, start] = useTransition();
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [formKey, setFormKey] = useState(0);

  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.success) {
      setEditing(null);
      setFormKey((k) => k + 1);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        {services.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0"
          >
            <div className="min-w-0">
              <p className={`text-[13.5px] font-semibold ${s.active ? "text-ink" : "text-muted line-through"}`}>
                {s.name}
              </p>
              <p className="text-[12px] text-muted">
                {s.owner_name ? `Giao cho ${s.owner_name}` : "Chưa giao ai"} · {s.lead_count} khách
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEditing(s)}
                className="btn btn-ghost btn-sm"
              >
                Sửa
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => start(() => toggleServiceActiveAction(s.id, !s.active))}
                className="btn btn-ghost btn-sm"
              >
                {s.active ? "Ẩn" : "Bật lại"}
              </button>
              {s.lead_count === 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`Xoá "${s.name}"?`)) start(() => deleteServiceAction(s.id));
                  }}
                  className="px-2 py-1 text-[12px] text-muted hover:text-rose-600"
                >
                  Xoá
                </button>
              )}
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <p className="py-4 text-center text-[13px] text-muted">Chưa có mảng nào.</p>
        )}
      </div>

      <form key={formKey} action={formAction} className="space-y-3 border-t border-line-soft pt-4">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <input type="hidden" name="kind" value={kind} />
        <p className="text-[13px] font-semibold text-ink">
          {editing
            ? `Sửa "${editing.name}"`
            : isFanpage
              ? "Thêm fanpage / dự án"
              : "Thêm môn học"}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">{isFanpage ? "Tên fanpage / dự án" : "Tên môn học"}</label>
            <input
              name="name"
              required
              defaultValue={editing?.name || ""}
              placeholder={isFanpage ? "VD: Guitar online 1:1" : "VD: Quay dựng"}
              className="input"
            />
          </div>
          <div>
            <label className="label">Người phụ trách mặc định</label>
            <select
              name="default_owner_id"
              defaultValue={editing?.default_owner_id ? String(editing.default_owner_id) : ""}
              className="input"
            >
              <option value="">Chưa giao ai</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {state.error && <p className="text-[13px] text-rose-600">{state.error}</p>}
        <div className="flex items-center gap-2">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {editing ? "Lưu thay đổi" : isFanpage ? "Thêm fanpage" : "Thêm môn"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormKey((k) => k + 1);
              }}
              className="btn btn-ghost"
            >
              Thôi
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
