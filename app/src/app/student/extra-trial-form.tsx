"use client";

import { useActionState, useState } from "react";
import { requestExtraTrialAction } from "@/actions/trial";
import type { FormState } from "@/actions/teachers";
import { SUBJECT_SUGGESTIONS } from "@/lib/types";
import { IconCheckCircle, IconPlus } from "@/components/icons";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

/**
 * Học viên đang học xin học thử thêm một môn khác. Mở ra khi bấm chứ không
 * bày sẵn: phần lớn lượt vào trang này là để xem lịch, form mở sẵn chỉ làm
 * loãng trang.
 */
export default function ExtraTrialForm({ studyingSubjects }: { studyingSubjects: string[] }) {
  const [state, formAction, pending] = useActionState(requestExtraTrialAction, initialState);
  const [open, setOpen] = useState(false);

  // Môn đang học rồi thì để xuống dưới — người ta vào đây để thử môn mới.
  const studying = new Set(studyingSubjects.map((s) => s.toLowerCase()));
  const options = [
    ...SUBJECT_SUGGESTIONS.filter((s) => !studying.has(s.toLowerCase())),
    ...SUBJECT_SUGGESTIONS.filter((s) => studying.has(s.toLowerCase())),
  ];

  if (state.success) {
    return (
      <div className="text-center py-2">
        <IconCheckCircle className="w-9 h-9 text-mint-600 mx-auto" />
        <p className="font-semibold text-ink-900 mt-2">Đã nhận đăng ký học thử của bạn</p>
        <p className="text-sm text-ink-600 mt-1">
          Trung tâm sẽ liên hệ để xếp buổi học thử miễn phí cho môn bạn chọn.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink-900">Muốn học thêm môn khác?</p>
          <p className="text-sm text-ink-500 mt-0.5">
            Trung tâm còn dạy {SUBJECT_SUGGESTIONS.join(", ")} — buổi học thử miễn phí, không ràng
            buộc gói.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className={`${btn.secondary} py-2`}>
          <IconPlus className="w-4 h-4" />
          Đăng ký học thử môn khác
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <p className="font-semibold text-ink-900">Đăng ký học thử môn khác</p>
        <p className="text-sm text-ink-500 mt-0.5">
          Trung tâm dùng luôn tên và số liên hệ của tài khoản này, bạn không cần nhập lại.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="et-subject">
            Môn muốn học thử
          </label>
          <select id="et-subject" name="subject" defaultValue={options[0]} className={field}>
            {options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="et-note">
            Ghi chú
          </label>
          <input
            id="et-note"
            name="note"
            maxLength={500}
            placeholder="VD: học cho bé lớp 3, rảnh tối T3–T5"
            className={field}
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={`${btn.primary} py-2.5`}>
          {pending ? "Đang gửi..." : "Gửi đăng ký học thử"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btn.ghost}>
          Huỷ
        </button>
      </div>
    </form>
  );
}
