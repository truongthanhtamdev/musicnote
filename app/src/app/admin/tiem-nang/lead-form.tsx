"use client";

import { useActionState, useState } from "react";
import { createLeadAction, updateLeadAction } from "@/actions/leads";
import type { FormState } from "@/actions/teachers";
import { LEAD_STAGES, LEAD_STAGE_LABELS, type LeadRow } from "@/lib/lead-types";
import { SUBJECT_SUGGESTIONS } from "@/lib/types";
import { Modal } from "@/components/modal";
import { btn, field, label } from "@/components/ui";
import { IconPlus } from "@/components/icons";

const initialState: FormState = {};

const SOURCES = [
  "Quảng cáo Facebook",
  "Nhắn tin trang",
  "Zalo",
  "Giới thiệu",
  "Tự tìm thấy web",
  "Khác",
];

/**
 * Thêm hoặc sửa khách tiềm năng.
 *
 * Chỉ bắt buộc tên. Giáo vụ đang ngồi trong hộp thư Facebook, nhiều khi mới
 * biết mỗi cái tên — bắt điền đủ thì người ta bỏ không nhập, mà không nhập
 * thì mất khách, tức mất đúng thứ trang này sinh ra để giữ.
 */
export default function LeadForm({ lead }: { lead?: LeadRow }) {
  const editing = !!lead;
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    editing ? updateLeadAction : createLeadAction,
    initialState
  );

  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.success) setOpen(false);
  }

  return (
    <>
      {editing ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-semibold text-ink-500 hover:text-ink-900 px-2 py-1"
        >
          Sửa
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={btn.primary}>
          <IconPlus className="w-4 h-4" />
          Thêm khách
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Sửa thông tin khách" : "Thêm khách tiềm năng"}
        subtitle={editing ? lead.name : "Chỉ cần tên là lưu được, phần còn lại điền dần"}
      >
        <form action={formAction} className="space-y-4">
          {editing && <input type="hidden" name="id" value={lead.id} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="l-name">
                Tên khách *
              </label>
              <input
                id="l-name"
                name="name"
                required
                maxLength={120}
                defaultValue={lead?.name ?? ""}
                className={field}
              />
            </div>
            <div>
              <label className={label} htmlFor="l-phone">
                Số điện thoại / Zalo
              </label>
              <input
                id="l-phone"
                name="phone"
                maxLength={40}
                defaultValue={lead?.phone ?? ""}
                className={field}
              />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="l-fb">
              Link Facebook
            </label>
            <input
              id="l-fb"
              name="facebook_url"
              maxLength={300}
              placeholder="Dán link trang cá nhân để lần sau bấm vào nhắn tiếp"
              defaultValue={lead?.facebook_url ?? ""}
              className={field}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={label} htmlFor="l-subject">
                Muốn học
              </label>
              <select id="l-subject" name="subject" defaultValue={lead?.subject ?? ""} className={field}>
                <option value="">Chưa rõ</option>
                {SUBJECT_SUGGESTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="l-source">
                Từ đâu tới
              </label>
              <select id="l-source" name="source" defaultValue={lead?.source ?? ""} className={field}>
                <option value="">Chưa rõ</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="l-stage">
                Giai đoạn
              </label>
              <select id="l-stage" name="stage" defaultValue={lead?.stage ?? "new"} className={field}>
                {LEAD_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={label} htmlFor="l-followup">
              Hẹn liên hệ lại ngày
            </label>
            <input
              id="l-followup"
              type="date"
              name="next_follow_up"
              defaultValue={lead?.next_follow_up ?? ""}
              className={`${field} w-auto`}
            />
            <p className="text-xs text-ink-400 mt-1.5">
              Đây là phần quan trọng nhất. Khách nói &ldquo;hai tuần nữa liên hệ lại&rdquo; thì
              điền ngày vào đây, tới hôm đó hệ thống nhắc.
            </p>
          </div>

          <div>
            <label className={label} htmlFor="l-note">
              Khách thế nào
            </label>
            <textarea
              id="l-note"
              name="note"
              rows={4}
              maxLength={2000}
              placeholder="VD: muốn cho bé học tiếng Việt, đang đi du lịch 2 tuần, ở múi giờ New York nên chỉ học được buổi tối…"
              defaultValue={lead?.note ?? ""}
              className={field}
            />
          </div>

          {state.error && <p className="text-sm text-coral-600">{state.error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={btn.secondary}>
              Huỷ
            </button>
            <button type="submit" disabled={pending} className={btn.primary}>
              {pending ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Thêm khách"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
