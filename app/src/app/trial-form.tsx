"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitTrialRequestAction, type TrialFormState } from "@/actions/trial";
import { LANGUAGE_LABELS, SUBJECT_SUGGESTIONS } from "@/lib/types";
import { IconCheckCircle } from "@/components/icons";

const initialState: TrialFormState = {};

const inputClass =
  "w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-wood-400 focus:ring-2 focus:ring-wood-500/20 focus:outline-none transition";
const labelClass = "block text-sm font-medium text-ink-700 mb-1.5";

export function TrialForm() {
  const [state, formAction, pending] = useActionState(submitTrialRequestAction, initialState);
  const [formKey, setFormKey] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Gửi xong thì xoá trắng form để người tiếp theo điền được ngay, và để
  // chính người vừa gửi không bấm lần nữa thành đăng ký trùng. `dismissed`
  // được mở lại mỗi lần có kết quả mới, nên lời cảm ơn vẫn hiện cho lượt sau.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setFormKey((k) => k + 1);
      setDismissed(false);
    }
  }

  if (state.success && !dismissed) {
    return (
      <div className="bg-white rounded-2xl border border-mint-200 p-6 sm:p-8 text-center">
        <IconCheckCircle className="w-10 h-10 text-mint-600 mx-auto" />
        <h3 className="text-lg font-bold text-ink-900 mt-3">Đã nhận đăng ký của bạn</h3>
        <p className="text-ink-600 mt-1.5">
          Trung tâm sẽ liên hệ trong thời gian sớm nhất để xếp buổi học thử miễn phí.
        </p>

        {/* Tài khoản hiện ngay ở đây vì trung tâm chưa gửi được email — khách
            không chụp lại bây giờ thì phải nhắn Zalo xin lại. */}
        {state.account && (
          <div className="mt-5 rounded-xl border border-navy-100 bg-ivory-50 px-4 py-4 text-left">
            <p className="font-semibold text-ink-900">Tài khoản theo dõi lịch học của bạn</p>
            <dl className="mt-2 text-sm space-y-1">
              <div className="flex gap-2">
                <dt className="text-ink-500 w-24 shrink-0">Đăng nhập</dt>
                <dd className="tabular font-medium text-ink-900">{state.account.login}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink-500 w-24 shrink-0">Mật khẩu</dt>
                <dd className="font-mono font-semibold text-wood-700">{state.account.password}</dd>
              </div>
            </dl>
            <p className="text-xs text-ink-500 mt-2">
              Chụp màn hình hoặc lưu lại giúp bạn nhé — mật khẩu chỉ hiện lần này. Đăng nhập xong
              bạn đổi được mật khẩu riêng.
            </p>
            <Link
              href="/login"
              className="mt-3 inline-block rounded-xl bg-wood-500 hover:bg-wood-600 text-white text-sm font-semibold px-4 py-2.5"
            >
              Đăng nhập ngay
            </Link>
          </div>
        )}
        {state.accountExists && (
          <p className="mt-5 text-sm text-ink-600 bg-ivory-50 border border-navy-100 rounded-xl px-4 py-3">
            Số điện thoại này đã có tài khoản ở trung tâm — bạn{" "}
            <Link href="/login" className="font-semibold text-wood-600 hover:underline">
              đăng nhập
            </Link>{" "}
            bằng số đó để xem lịch. Quên mật khẩu thì nhắn Zalo cho trung tâm.
          </p>
        )}

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-4 text-sm font-semibold text-wood-600 hover:text-wood-700"
        >
          Đăng ký thêm một người nữa
        </button>
      </div>
    );
  }

  return (
    <form
      key={formKey}
      action={formAction}
      className="bg-white rounded-2xl border border-navy-100 p-5 sm:p-7 space-y-4"
    >
      <div className="grid grid-cols-1 [&>*]:min-w-0 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="t-name">
            Họ tên học viên <span className="text-coral-500">*</span>
          </label>
          <input id="t-name" name="name" required maxLength={100} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="t-phone">
            Số điện thoại <span className="text-coral-500">*</span>
          </label>
          <input
            id="t-phone"
            name="phone"
            type="tel"
            required
            maxLength={30}
            placeholder="VD: 0901 234 567"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="t-subject">
            Muốn học
          </label>
          <select id="t-subject" name="subject" defaultValue="Guitar" className={inputClass}>
            {SUBJECT_SUGGESTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="t-language">
            Ngôn ngữ giảng dạy
          </label>
          <select id="t-language" name="language" defaultValue="vi" className={inputClass}>
            {Object.entries(LANGUAGE_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="t-contact">
            Facebook / Zalo / Email
          </label>
          <input
            id="t-contact"
            name="contact"
            maxLength={200}
            placeholder="Không bắt buộc — để trung tâm nhắn tin cho tiện"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="t-note">
            Ghi chú
          </label>
          <input
            id="t-note"
            name="note"
            maxLength={500}
            placeholder="VD: đang ở Úc, rảnh buổi tối; hoặc đã biết vài hợp âm cơ bản"
            className={inputClass}
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full sm:w-auto bg-coral-600 hover:bg-coral-700 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-3 transition"
      >
        {pending ? "Đang gửi..." : "Đăng ký học thử miễn phí"}
      </button>
      <p className="text-xs text-ink-400">
        Buổi học thử hoàn toàn miễn phí và không ràng buộc đăng ký gói. Gửi xong bạn nhận luôn tài
        khoản để theo dõi lịch học và tiến độ.
      </p>
    </form>
  );
}
