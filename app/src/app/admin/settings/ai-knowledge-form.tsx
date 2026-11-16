"use client";

import { useActionState } from "react";
import { saveAiKnowledgeAction } from "@/actions/settings";
import type { FormState } from "@/actions/teachers";
import { btn, field } from "@/components/ui";

const initialState: FormState = {};

export default function AiKnowledgeForm({ value }: { value: string }) {
  const [state, formAction, pending] = useActionState(saveAiKnowledgeAction, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <textarea
        name="ai_knowledge"
        defaultValue={value}
        rows={7}
        maxLength={6000}
        aria-label="Thông tin thêm cho AI tư vấn"
        placeholder={
          "VD:\n• Tháng 12 giảm 10% gói 50 buổi cho khách đăng ký trước 20/12.\n• Nghỉ Tết từ 25/1 đến 2/2.\n• Bé dưới 5 tuổi chưa nhận học Piano.\n• Đóng học phí qua chuyển khoản hoặc PayPal."
        }
        className={`${field} font-normal`}
      />
      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
      {state.success && <p className="text-sm text-mint-600">Đã lưu — AI dùng ngay từ tin nhắn tiếp theo.</p>}
      <button type="submit" disabled={pending} className={btn.primary}>
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
    </form>
  );
}
