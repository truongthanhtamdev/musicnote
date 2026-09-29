"use client";

import { useActionState, useState } from "react";
import { addClipAction } from "@/actions/clips";
import type { FormState } from "@/actions/teachers";
import { SUBJECT_SUGGESTIONS } from "@/lib/types";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

export default function AddClipForm() {
  const [state, formAction, pending] = useActionState(addClipAction, initialState);
  // Ô có state riêng để báo lỗi không làm mất link vừa dán (form tự xoá trắng
  // sau mỗi lần gửi); thêm xong thì mới xoá.
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.success) {
      setUrl("");
      setTitle("");
    }
  }

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <div>
        <label className={label} htmlFor="clip_url">
          Link clip
        </label>
        <input
          id="clip_url"
          name="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          inputMode="url"
          placeholder="Dán link YouTube / TikTok / Facebook"
          className={field}
        />
        <p className="text-xs text-ink-400 mt-1.5">
          Trong app bấm <b>Chia sẻ → Sao chép liên kết</b> rồi dán vào đây. Clip phải để chế độ công khai.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_160px] gap-3">
        <div>
          <label className={label} htmlFor="clip_title">
            Mô tả ngắn
          </label>
          <input
            id="clip_title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="VD: Bé An — 3 tháng học Piano"
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="clip_subject">
            Môn
          </label>
          <select id="clip_subject" name="subject" defaultValue="" className={field}>
            <option value="">—</option>
            {SUBJECT_SUGGESTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-ink-700">
        <input type="checkbox" name="is_public" defaultChecked className="mt-0.5 w-4 h-4 accent-wood-500" />
        <span>
          <b>Hiện trên trang chủ</b> — học viên / phụ huynh đã đồng ý cho đăng công khai.
        </span>
      </label>

      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
      {state.success && <p className="text-sm text-mint-600">Đã thêm clip.</p>}

      <button type="submit" disabled={pending} className={btn.primary}>
        {pending ? "Đang thêm..." : "Thêm clip"}
      </button>
    </form>
  );
}
