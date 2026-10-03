"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createTeacherAction, type FormState } from "@/actions/teachers";
import { SUBJECT_SUGGESTIONS } from "@/lib/types";
import { MoneyInput } from "@/components/money-input";

const initialState: FormState = {};

/** Mật khẩu tạm dễ đọc qua điện thoại: bỏ các ký tự dễ nhầm (0/O, 1/l/I). */
function randomPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => alphabet[b % alphabet.length]).join("");
}

export default function NewTeacherForm() {
  const [state, formAction, pending] = useActionState(createTeacherAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [handledState, setHandledState] = useState(state);

  if (state !== handledState) {
    setHandledState(state);
    setCopied(false);
    if (state.success) setPassword("");
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  const created = state.newTeacher;
  const loginText = created
    ? [
        `Chào ${created.name}, đây là tài khoản giáo viên của em:`,
        `Trang đăng nhập: ${window.location.origin}/login`,
        `Tên đăng nhập: ${created.email}${created.phone ? ` (hoặc SĐT ${created.phone})` : ""}`,
        `Mật khẩu: ${created.password}`,
        "Đăng nhập xong em vào mục Đổi mật khẩu để đặt mật khẩu riêng nhé.",
      ].join("\n")
    : "";

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          name="name"
          required
          placeholder="Họ tên"
          className="rounded-xl border border-navy-200 px-3 py-2 text-sm col-span-2"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email đăng nhập"
          className="rounded-xl border border-navy-200 px-3 py-2 text-sm col-span-2"
        />
        <input
          name="phone"
          placeholder="Số điện thoại"
          className="rounded-xl border border-navy-200 px-3 py-2 text-sm"
        />
        <MoneyInput
          name="pay_per_session"
          placeholder="Lương/buổi (VNĐ)"
          className="w-full rounded-xl border border-navy-200 px-3 py-2 text-sm tabular"
        />
        <div className="col-span-2 flex gap-2">
          <input
            name="password"
            type="text"
            required
            minLength={6}
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu tạm (ít nhất 6 ký tự)"
            className="min-w-0 flex-1 rounded-xl border border-navy-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setPassword(randomPassword())}
            className="shrink-0 rounded-xl border border-navy-200 bg-white hover:bg-ivory-100 px-3 py-2 text-sm font-medium text-ink-700"
          >
            Tạo tự động
          </button>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-ink-500 mb-1">Ngôn ngữ dạy được</label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input type="checkbox" className="w-[18px] h-[18px] accent-wood-600" name="languages" value="vi" defaultChecked /> Tiếng Việt
            </label>
            <label className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input type="checkbox" className="w-[18px] h-[18px] accent-wood-600" name="languages" value="en" /> Tiếng Anh
            </label>
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-ink-500 mb-1">Chuyên môn (chọn được nhiều môn)</label>
          <div className="flex flex-wrap gap-4 text-sm">
            {SUBJECT_SUGGESTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 py-1.5 cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] accent-wood-600" name="subjects" value={s} /> {s}
              </label>
            ))}
          </div>
          <input
            name="subjects_other"
            placeholder="Môn khác (nếu có, cách nhau bởi dấu phẩy)"
            className="mt-2 w-full rounded-xl border border-navy-200 px-3 py-2 text-sm"
          />
        </div>
      </div>
      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
      {created && (
        <div className="rounded-xl border border-mint-200 bg-mint-50 p-3 text-sm space-y-2">
          <p className="font-semibold text-mint-700">
            Đã tạo tài khoản cho {created.name} — gửi thông tin này cho giáo viên:
          </p>
          <pre className="whitespace-pre-wrap break-words font-sans text-ink-800">{loginText}</pre>
          <p className="text-xs text-ink-500">
            Mật khẩu chỉ hiện lần này. Quên thì vào trang giáo viên bấm &quot;Đặt lại mật khẩu&quot;.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(loginText);
                setCopied(true);
              } catch {
                window.prompt("Chép đoạn này gửi cho giáo viên:", loginText);
              }
            }}
            className="bg-mint-600 hover:bg-mint-700 text-white text-sm font-medium rounded-lg px-3 py-1.5"
          >
            {copied ? "Đã chép ✓" : "Chép để gửi Messenger"}
          </button>
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-wood-500 hover:bg-wood-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        {pending ? "Đang lưu..." : "Thêm giáo viên"}
      </button>
    </form>
  );
}
