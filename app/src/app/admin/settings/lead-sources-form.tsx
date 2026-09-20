"use client";

import { useActionState } from "react";
import { saveLeadSourcesAction } from "@/actions/settings";
import type { FormState } from "@/actions/teachers";
import { btn, field, label } from "@/components/ui";

const initialState: FormState = {};

export default function LeadSourcesForm({ sources }: { sources: string[] }) {
  const [state, formAction, pending] = useActionState(saveLeadSourcesAction, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <div>
        <label className={label} htmlFor="lead_sources">
          Mỗi dòng một nguồn
        </label>
        <textarea
          id="lead_sources"
          name="lead_sources"
          rows={8}
          defaultValue={sources.join("\n")}
          className={`${field} font-mono text-sm`}
        />
        <p className="text-xs text-ink-400 mt-1.5">
          Ghi rõ tên từng fanpage thay vì gộp chung &ldquo;Quảng cáo Facebook&rdquo;. Gộp lại thì
          mãi không biết trang nào ra khách tốt — mà đó mới là thứ quyết định đổ tiền vào đâu.
        </p>
      </div>

      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
      {state.success && <p className="text-sm text-mint-700">Đã lưu danh sách nguồn.</p>}

      <button type="submit" disabled={pending} className={btn.primary}>
        {pending ? "Đang lưu…" : "Lưu danh sách nguồn"}
      </button>
    </form>
  );
}
