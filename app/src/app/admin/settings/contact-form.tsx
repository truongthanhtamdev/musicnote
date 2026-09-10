"use client";

import { useActionState } from "react";
import { saveContactSettingsAction } from "@/actions/settings";
import type { FormState } from "@/actions/teachers";
import type { CenterContact } from "@/lib/types";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

export default function ContactForm({ contact }: { contact: CenterContact }) {
  const [state, formAction, pending] = useActionState(saveContactSettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <div>
        <label className={label} htmlFor="contact_facebook">
          Facebook trung tâm
        </label>
        <input
          id="contact_facebook"
          name="contact_facebook"
          defaultValue={contact.facebook || ""}
          placeholder="Link trang hoặc tên tài khoản, VD: pianoguitardemhat"
          className={field}
        />
        <p className="text-xs text-ink-400 mt-1.5">
          Dán nguyên link cũng được, hệ thống tự chuẩn hoá thành link mở được.
        </p>
      </div>

      <div>
        <label className={label} htmlFor="contact_zalo">
          Số Zalo
        </label>
        <input
          id="contact_zalo"
          name="contact_zalo"
          type="tel"
          inputMode="numeric"
          defaultValue={contact.zalo || ""}
          placeholder="VD: 0965817021"
          className={`${field} tabular`}
        />
      </div>

      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
      {state.success && <p className="text-sm text-mint-600">Đã lưu thông tin liên hệ.</p>}

      <button type="submit" disabled={pending} className={btn.primary}>
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
    </form>
  );
}
