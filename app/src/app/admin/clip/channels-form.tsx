"use client";

import { useActionState } from "react";
import { saveChannelsAction } from "@/actions/clips";
import type { FormState } from "@/actions/teachers";
import type { CenterChannels } from "@/lib/clips";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

export default function ChannelsForm({ channels }: { channels: CenterChannels }) {
  const [state, formAction, pending] = useActionState(saveChannelsAction, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <p className="text-sm text-ink-500">
        Hiện thành nút &quot;Xem thêm clip trên kênh&quot; dưới mục clip ở trang chủ. Facebook lấy từ phần
        Cài đặt → Facebook & Zalo liên hệ.
      </p>
      <div>
        <label className={label} htmlFor="ch_youtube">
          Kênh YouTube
        </label>
        <input
          id="ch_youtube"
          name="youtube"
          defaultValue={channels.youtube || ""}
          placeholder="VD: @pianoguitardemhat hoặc dán link kênh"
          className={field}
        />
      </div>
      <div>
        <label className={label} htmlFor="ch_tiktok">
          Kênh TikTok
        </label>
        <input
          id="ch_tiktok"
          name="tiktok"
          defaultValue={channels.tiktok || ""}
          placeholder="VD: @pianoguitardemhat hoặc dán link kênh"
          className={field}
        />
      </div>
      {state.success && <p className="text-sm text-mint-600">Đã lưu kênh.</p>}
      <button type="submit" disabled={pending} className={btn.primary}>
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
    </form>
  );
}
