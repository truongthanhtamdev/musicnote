"use client";

import { useActionState, useState } from "react";
import { importCenterSheetAction, type CenterImportState } from "@/actions/import";
import { btn, field } from "@/components/ui";

const initialState: CenterImportState = {};

/**
 * Nhập bảng Excel của trung tâm. Luôn xem trước trước khi ghi: một lần nhập là
 * vài trăm lớp, sai thì dọn rất cực.
 */
export default function CenterSheetImportForm() {
  const [state, formAction, pending] = useActionState(importCenterSheetAction, initialState);
  // Giữ file trong state chứ không để trong ô input: React xoá trắng form sau
  // mỗi lần action chạy xong, nên bấm "Xem trước" xong là ô input rỗng và lần
  // bấm "Nhập thật" sẽ không còn file để gửi.
  const [file, setFile] = useState<File | null>(null);
  const report = state.report;
  const previewed = !!report?.dryRun;

  function submit(commit: "0" | "1") {
    if (!file) return;
    const data = new FormData();
    data.set("file", file);
    data.set("commit", commit);
    formAction(data);
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept=".xlsx"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className={`${field} file:mr-3 file:rounded-lg file:border-0 file:bg-ivory-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink-700`}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submit("0")}
          disabled={pending || !file}
          className={`${btn.secondary} disabled:opacity-50`}
        >
          {pending ? "Đang xử lý..." : "Xem trước"}
        </button>
        <button
          type="button"
          onClick={() => submit("1")}
          disabled={pending || !previewed}
          title={previewed ? undefined : "Xem trước trước đã"}
          className={`${btn.primary} disabled:opacity-50`}
        >
          Nhập thật vào hệ thống
        </button>
      </div>

      <p className="text-xs text-ink-400">
        Nhập lại cùng một file không tạo lớp trùng: hệ thống khớp theo cột MÃ, lớp đã có thì cập
        nhật trạng thái, giáo viên và gói học.
      </p>

      {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
      {state.summary && (
        <p className={`text-sm font-medium ${previewed ? "text-ink-700" : "text-mint-700"}`}>
          {state.summary}
        </p>
      )}

      {report && (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ["Lớp mới", report.created],
              ["Lớp cập nhật", report.updated],
              ["Gói học", report.packages],
              ["GV khớp / tạo mới", `${report.teachersMatched.length} / ${report.teachersCreated.length}`],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-navy-100 px-3 py-2">
                <p className="text-xs text-ink-500">{label}</p>
                <p className="font-semibold text-ink-900 tabular">{value}</p>
              </div>
            ))}
          </div>

          <details className="rounded-xl border border-navy-100 px-3 py-2">
            <summary className="cursor-pointer font-medium text-ink-800">
              Trạng thái lớp ({report.stageCounts.length} loại)
            </summary>
            <ul className="mt-2 space-y-0.5 text-ink-600">
              {report.stageCounts.map(([label, n]) => (
                <li key={label} className="tabular">
                  {label}: {n}
                </li>
              ))}
            </ul>
          </details>

          {report.teachersCreated.length > 0 && (
            <details className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2" open>
              <summary className="cursor-pointer font-medium text-ink-900">
                Giáo viên được tạo tài khoản mới ({report.teachersCreated.length}) — lưu mật khẩu
                này lại
              </summary>
              <ul className="mt-2 space-y-1 text-ink-700">
                {report.teachersCreated.map((t) => (
                  <li key={t.email} className="tabular">
                    {t.name} · {t.email} · <span className="font-semibold">{t.password}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-500 mt-2">
                {report.dryRun
                  ? "Chưa tạo — bấm “Nhập thật” thì mới tạo, và mật khẩu sẽ được sinh lại."
                  : "Gửi mật khẩu cho giáo viên và nhắc họ đổi lại sau khi đăng nhập."}
              </p>
            </details>
          )}

          {report.clashes.length > 0 && (
            <details className="rounded-xl border border-coral-300 bg-coral-50 px-3 py-2" open>
              <summary className="cursor-pointer font-medium text-ink-900">
                Trùng giờ giáo viên ({report.clashes.length} cặp) — vẫn nhập, nhưng nên soát lại
              </summary>
              <ul className="mt-2 space-y-1 text-ink-700">
                {report.clashes.map((c, i) => (
                  <li key={`${c.teacherName}-${i}`}>
                    <span className="font-medium text-ink-900">{c.teacherName}</span> {c.dayLabel}:{" "}
                    {c.a} ↔ {c.b}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-500 mt-2">
                Có thể là lớp nhóm 2 người, cũng có thể gõ nhầm giờ trong file. Hệ thống ghi đúng
                như file chứ không tự sửa.
              </p>
            </details>
          )}

          {report.warnings.length > 0 && (
            <details className="rounded-xl border border-navy-100 px-3 py-2">
              <summary className="cursor-pointer font-medium text-ink-800">
                Dòng cần soát lại ({report.warnings.length})
              </summary>
              <ul className="mt-2 space-y-1 text-ink-600">
                {report.warnings.map((w, i) => (
                  <li key={`${w.student}-${i}`}>
                    <span className="font-medium text-ink-900">{w.student}</span>:{" "}
                    {w.messages.join(" · ")}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
