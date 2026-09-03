"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createClassAction } from "@/actions/classes";
import type { FormState } from "@/actions/teachers";
import { SlotsField } from "@/components/slots-field";
import { Modal } from "@/components/modal";
import { IconAlert, IconPlus, SubjectIcon } from "@/components/icons";
import { btn, field, label } from "@/components/ui";
import {
  SUBJECT_SUGGESTIONS,
  LANGUAGE_LABELS,
  SOURCE_LABELS,
  SCHEDULE_TYPE_LABELS,
  type ClassScheduleType,
} from "@/lib/types";

const initialState: FormState = {};

export default function NewClassForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createClassAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [scheduleType, setScheduleType] = useState<ClassScheduleType>("fixed");
  const [slotsKey, setSlotsKey] = useState(0);

  // Close the panel once a save succeeds. Adjusting state during render
  // (rather than in an effect) avoids an extra commit-then-rerender pass.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
      setScheduleType("fixed");
      setSlotsKey((k) => k + 1);
    }
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btn.primary}>
        <IconPlus className="w-4 h-4" />
        Thêm lớp
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Thêm lớp học mới"
        subtitle="Lớp sẽ tự động được gán cho bạn và hiện ngay trong lịch tuần."
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setOpen(false)} className={btn.secondary}>
              Huỷ
            </button>
            <button
              type="submit"
              form="teacher-new-class-form"
              disabled={pending}
              className={btn.primary}
            >
              {pending ? "Đang lưu..." : "Lưu lớp học"}
            </button>
          </div>
        }
      >
        <form
          id="teacher-new-class-form"
          ref={formRef}
          action={formAction}
          className="space-y-5"
        >
          {/* Học viên */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Thông tin học viên
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={label} htmlFor="n-name">
                  Tên học viên <span className="text-coral-500">*</span>
                </label>
                <input
                  id="n-name"
                  name="student_name"
                  required
                  placeholder="VD: Bé Minh Khang"
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="n-phone">
                  SĐT học viên / khách hàng
                </label>
                <input
                  id="n-phone"
                  name="student_phone"
                  placeholder="Không bắt buộc"
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="n-guardian">
                  Tên khách hàng
                </label>
                <input
                  id="n-guardian"
                  name="guardian_name"
                  placeholder="Người đóng học phí"
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="n-level">
                  Trình độ
                </label>
                <input id="n-level" name="level" placeholder="VD: Cơ bản" className={field} />
              </div>
              <div>
                <label className={label} htmlFor="n-source">
                  Nguồn lớp
                </label>
                <select id="n-source" name="source" defaultValue="center" className={field}>
                  {Object.entries(SOURCE_LABELS).map(([v, text]) => (
                    <option key={v} value={v}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Môn học */}
          <section className="space-y-4 pt-4 border-t border-navy-100">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Bộ môn &amp; ngôn ngữ
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="n-subject">
                  Bộ môn
                </label>
                <div className="relative">
                  <SubjectIcon
                    subject="Guitar"
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-wood-500 pointer-events-none"
                  />
                  <input
                    id="n-subject"
                    name="subject"
                    list="subject-suggestions"
                    defaultValue="Guitar"
                    className={`${field} pl-9`}
                  />
                </div>
                <datalist id="subject-suggestions">
                  {SUBJECT_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={label} htmlFor="n-language">
                  Ngôn ngữ giảng dạy
                </label>
                <select id="n-language" name="language" defaultValue="vi" className={field}>
                  {Object.entries(LANGUAGE_LABELS).map(([v, text]) => (
                    <option key={v} value={v}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Lịch học */}
          <section className="space-y-4 pt-4 border-t border-navy-100">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Lịch học
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(SCHEDULE_TYPE_LABELS) as [ClassScheduleType, string][]).map(
                ([v, text]) => (
                  <label key={v} className="block">
                    <input
                      type="radio"
                      name="schedule_type"
                      value={v}
                      checked={scheduleType === v}
                      onChange={() => setScheduleType(v)}
                      className="peer sr-only"
                    />
                    <span className="block text-center border border-navy-200 rounded-xl py-2.5 px-2 text-sm font-semibold text-ink-700 transition cursor-pointer hover:border-navy-300 peer-checked:border-wood-400 peer-checked:bg-wood-50 peer-checked:text-wood-700">
                      {text}
                    </span>
                  </label>
                )
              )}
            </div>

            {scheduleType === "fixed" && (
              <div>
                <span className={label}>
                  Thứ / giờ học
                  <span className="font-normal text-ink-400">
                    {" "}
                    — học nhiều buổi/tuần thì thêm từng buổi
                  </span>
                </span>
                <SlotsField key={slotsKey} />
              </div>
            )}

            <div>
              <label className={label} htmlFor="n-notes">
                Ghi chú
              </label>
              <input id="n-notes" name="notes" placeholder="Không bắt buộc" className={field} />
            </div>
          </section>

          {state.error && (
            <p className="text-sm text-coral-700 bg-coral-50 border border-coral-100 rounded-xl px-3 py-2 flex items-center gap-2">
              <IconAlert className="w-4 h-4 shrink-0" />
              {state.error}
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}
