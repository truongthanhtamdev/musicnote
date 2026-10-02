"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { submitTrialRequestAction, type TrialFormState } from "@/actions/trial";
import { LANGUAGE_LABELS, SUBJECT_SUGGESTIONS } from "@/lib/types";
import { IconCheckCircle } from "@/components/icons";
import { trackEvent } from "@/lib/analytics";
import { FacebookSteps } from "@/components/facebook-steps";

const initialState: TrialFormState = {};

const inputClass =
  "w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-wood-400 focus:ring-2 focus:ring-wood-500/20 focus:outline-none transition";
const labelClass = "block text-sm font-medium text-ink-700 mb-1.5";

export function TrialForm({
  onSubmitted,
  onSpinClick,
  facebookUrl = null,
  wonSessions = null,
}: {
  /** Đã quay xong vòng quay: hiện kết quả thay cho nút "Quay". */
  wonSessions?: number | null;
  /** Facebook em Tâm — bước "kết bạn để được sắp lớp" sau khi đăng ký. */
  facebookUrl?: string | null;
  /** Gửi thành công — `wheelOpen` báo vòng quay vừa được mở cho đăng ký này. */
  onSubmitted?: (wheelOpen: boolean) => void;
  onSpinClick?: () => void;
} = {}) {
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

  // Ghi nhận chuyển đổi cho Google Analytics: đây là câu trả lời cho
  // "trang nào kéo ra khách đăng ký học thử". Chạy trong useEffect vì mỗi
  // lượt gửi thành công tạo một đối tượng state mới, nên đếm đúng một lần.
  useEffect(() => {
    if (!state.success) return;
    trackEvent("dang_ky_hoc_thu");
    onSubmitted?.(!!state.wheelOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy một lần cho mỗi lượt gửi
  }, [state]);

  if (state.success && !dismissed) {
    return (
      <div className="bg-white rounded-2xl border border-mint-200 p-5 sm:p-8">
        <div className="text-center">
          <IconCheckCircle className="w-11 h-11 text-mint-600 mx-auto" />
          <h3 className="text-xl font-bold text-ink-900 mt-3">Cảm ơn bạn đã đăng ký học thử!</h3>
          <p className="text-ink-600 mt-1.5">
            {state.trialSessions && state.trialSessions > 1
              ? `Trung tâm sẽ liên hệ sớm nhất để xếp ${state.trialSessions} buổi học thử miễn phí bạn vừa quay trúng.`
              : "Trung tâm sẽ liên hệ trong thời gian sớm nhất để xếp buổi học thử miễn phí."}{" "}
            Bạn làm tiếp 2 bước dưới đây nhé:
          </p>
          {wonSessions ? (
            <p className="mt-4 inline-block rounded-xl bg-mint-50 border border-mint-200 text-mint-800 px-4 py-2 text-sm font-semibold">
              🎁 Bạn được tặng thêm {wonSessions} buổi khi đăng ký khóa học
            </p>
          ) : state.wheelOpen && (
            <button
              type="button"
              onClick={onSpinClick}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-coral-600 hover:bg-coral-700 text-white px-5 py-2.5 text-sm font-semibold transition"
            >
              🎁 Quay vòng quay may mắn — tặng tới 3 buổi khi đăng ký khóa
            </button>
          )}
        </div>

        <ol className="mt-6 space-y-3">
          {/* Bước 1: đăng nhập. Tài khoản nằm ngay trong bước này — mật khẩu
              chỉ hiện đúng lần này, khách không lưu lại là phải nhắn xin. */}
          <li className="rounded-xl border border-navy-100 bg-ivory-50 px-4 py-4">
            <p className="font-semibold text-ink-900">① Đăng nhập tài khoản để xem lịch học</p>
            <p className="text-sm text-ink-600 mt-1">
              Trung tâm xếp lịch xong, <b>link học Google Meet</b> sẽ hiện ở nút <b>“Vào lớp”</b> trong tài
              khoản của bạn
              {state.email ? (
                <>
                  {" "}và được gửi về email <b>{state.email}</b>
                </>
              ) : null}
              .
            </p>
            {state.account ? (
              <div className="mt-3 rounded-lg border border-wood-200 bg-white px-3.5 py-3">
                <dl className="text-sm space-y-1">
                  <div className="flex gap-2">
                    <dt className="text-ink-500 w-24 shrink-0">Đăng nhập</dt>
                    <dd className="tabular font-semibold text-ink-900">{state.account.login}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-ink-500 w-24 shrink-0">Mật khẩu</dt>
                    <dd className="font-mono font-semibold text-wood-700">{state.account.password}</dd>
                  </div>
                </dl>
                <p className="text-xs text-coral-700 mt-2">
                  📸 Chụp màn hình lại giúp bạn nhé — mật khẩu chỉ hiện lần này. Đăng nhập xong bạn đổi được
                  mật khẩu riêng.
                </p>
              </div>
            ) : state.accountExists ? (
              <p className="mt-2 text-sm text-ink-600">
                Số điện thoại này đã có tài khoản ở trung tâm — bạn đăng nhập bằng số đó. Quên mật khẩu thì
                nhắn em Tâm ở bước ② để được cấp lại.
              </p>
            ) : null}
            <Link
              href="/login"
              className="mt-3 inline-flex items-center rounded-xl bg-wood-500 hover:bg-wood-600 text-white text-sm font-semibold px-4 py-2.5"
            >
              Đăng nhập ngay
            </Link>
          </li>

          {facebookUrl && (
            <li className="rounded-xl border border-[#1877f2]/25 bg-[#1877f2]/5 px-4 py-4">
              <p className="font-semibold text-ink-900">② Kết bạn &amp; nhắn tin với em Tâm</p>
              <p className="text-sm text-ink-600 mt-1 mb-3">
                Để được <b>tạo lớp và tư vấn sớm nhất</b>. Bấm nút là mở thẳng app Facebook / Messenger trên
                điện thoại.
              </p>
              <FacebookSteps facebookUrl={facebookUrl} />
            </li>
          )}
        </ol>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="mt-4 text-sm font-semibold text-wood-600 hover:text-wood-700"
          >
            Đăng ký thêm một người nữa
          </button>
        </div>
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
          <label className={labelClass} htmlFor="t-email">
            Email
          </label>
          <input
            id="t-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={200}
            placeholder="Để nhận link học thử Google Meet qua mail"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="t-contact">
            Facebook / Zalo
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
