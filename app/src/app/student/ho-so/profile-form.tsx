"use client";

import { useActionState, useState } from "react";
import { saveMyProfileAction } from "@/actions/account";
import type { FormState } from "@/actions/teachers";
import { IconCheckCircle } from "@/components/icons";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

export interface MyProfile {
  name: string;
  phone: string;
  facebookUrl: string;
  address: string;
  note: string;
}

/**
 * Khách tự điền thông tin liên hệ. Chỉ hỏi những thứ trung tâm thật sự cần để
 * gọi/nhắn được cho khách — hỏi nhiều thì không ai điền.
 */
export default function ProfileForm({ profile }: { profile: MyProfile }) {
  const [state, formAction, pending] = useActionState(saveMyProfileAction, initialState);
  const [saved, setSaved] = useState(false);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setSaved(true);
  }

  return (
    <form action={formAction} className="space-y-4" onChange={() => setSaved(false)}>
      <div>
        <label className={label} htmlFor="p-name">
          Họ tên người đăng ký <span className="text-coral-500">*</span>
        </label>
        <input
          id="p-name"
          name="name"
          required
          maxLength={100}
          defaultValue={profile.name}
          className={field}
        />
        <p className="text-xs text-ink-400 mt-1">
          Người đóng học phí và liên hệ với trung tâm — có thể là ba mẹ của học viên.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="p-phone">
            Số điện thoại
          </label>
          <input
            id="p-phone"
            name="phone"
            type="tel"
            maxLength={30}
            defaultValue={profile.phone}
            placeholder="VD: 0901 234 567"
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="p-facebook">
            Facebook / Zalo
          </label>
          <input
            id="p-facebook"
            name="facebook_url"
            maxLength={200}
            defaultValue={profile.facebookUrl}
            placeholder="Link Facebook hoặc số Zalo"
            className={field}
          />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="p-address">
          Địa chỉ
        </label>
        <input
          id="p-address"
          name="address"
          maxLength={200}
          defaultValue={profile.address}
          placeholder="Không bắt buộc — quận/huyện, tỉnh thành là đủ"
          className={field}
        />
      </div>

      <div>
        <label className={label} htmlFor="p-note">
          Ghi chú cho trung tâm
        </label>
        <textarea
          id="p-note"
          name="note"
          rows={3}
          maxLength={500}
          defaultValue={profile.note}
          placeholder="VD: bé học lớp 3, đang ở Úc nên rảnh buổi tối giờ VN, đã biết vài hợp âm cơ bản"
          className={field}
        />
      </div>

      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
      {saved && (
        <p className="text-sm text-mint-700 bg-mint-50 border border-mint-100 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
          <IconCheckCircle className="w-4.5 h-4.5 shrink-0" />
          Đã lưu. Cảm ơn bạn — trung tâm liên hệ được dễ hơn rồi.
        </p>
      )}

      <button type="submit" disabled={pending} className={`${btn.primary} py-2.5`}>
        {pending ? "Đang lưu..." : "Lưu thông tin"}
      </button>
    </form>
  );
}
