"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createClassAction } from "@/actions/classes";
import type { FormState } from "@/actions/teachers";
import { SlotsField } from "@/components/slots-field";
import { Modal } from "@/components/modal";
import { IconAlert, IconPlus } from "@/components/icons";
import { btn, field, label } from "@/components/ui";
import {
  SUBJECT_SUGGESTIONS,
  LANGUAGE_LABELS,
  PACKAGE_OPTIONS,
  SCHEDULE_TYPE_LABELS,
  type ClassScheduleType,
  type UserRow,
} from "@/lib/types";

const initialState: FormState = {};

export default function NewClassForm({ teachers }: { teachers: UserRow[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createClassAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [scheduleType, setScheduleType] = useState<ClassScheduleType>("fixed");
  const [slotsKey, setSlotsKey] = useState(0);

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
        subtitle="Học viên học nhiều buổi/tuần thì thêm từng buổi — các buổi dùng chung một gói học."
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setOpen(false)} className={btn.secondary}>
              Huỷ
            </button>
            <button
              type="submit"
              form="admin-new-class-form"
              disabled={pending}
              className={btn.primary}
            >
              {pending ? "Đang lưu..." : "Lưu lớp học"}
            </button>
          </div>
        }
      >
        <form id="admin-new-class-form" ref={formRef} action={formAction} className="space-y-5">
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Thông tin học viên
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={label} htmlFor="a-name">
                  Tên học viên <span className="text-coral-500">*</span>
                </label>
                <input
                  id="a-name"
                  name="student_name"
                  required
                  placeholder="VD: Nguyễn Minh Khang"
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="a-phone">
                  SĐT học viên / phụ huynh
                </label>
                <input id="a-phone" name="student_phone" className={field} />
              </div>
              <div>
                <label className={label} htmlFor="a-guardian">
                  Tên phụ huynh
                </label>
                <input
                  id="a-guardian"
                  name="guardian_name"
                  placeholder="Nếu học viên là trẻ em"
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="a-level">
                  Trình độ
                </label>
                <input id="a-level" name="level" placeholder="VD: Cơ bản" className={field} />
              </div>
              <div>
                <label className={label} htmlFor="a-language">
                  Ngôn ngữ giảng dạy
                </label>
                <select id="a-language" name="language" defaultValue="vi" className={field}>
                  {Object.entries(LANGUAGE_LABELS).map(([v, text]) => (
                    <option key={v} value={v}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-navy-100">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Bộ môn, gói học &amp; giáo viên
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="a-subject">
                  Bộ môn
                </label>
                <input
                  id="a-subject"
                  name="subject"
                  list="subject-suggestions"
                  defaultValue="Guitar"
                  className={field}
                />
                <datalist id="subject-suggestions">
                  {SUBJECT_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={label} htmlFor="a-package">
                  Gói học
                </label>
                <select
                  id="a-package"
                  name="package_total_sessions"
                  defaultValue=""
                  className={field}
                >
                  <option value="">Không theo gói (học đều đặn)</option>
                  {PACKAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      Gói {n} tiết
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="a-teacher">
                  Giáo viên phụ trách
                </label>
                <select id="a-teacher" name="teacher_id" defaultValue="" className={field}>
                  <option value="">Chưa xếp giáo viên</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

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
              <label className={label} htmlFor="a-notes">
                Ghi chú
              </label>
              <input id="a-notes" name="notes" placeholder="Không bắt buộc" className={field} />
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
