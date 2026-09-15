"use client";

import { useActionState, useState } from "react";
import {
  createStudentAccountsAction,
  type BulkAccountState,
  type CreatedAccount,
} from "@/actions/students";
import type { AccountCandidate } from "@/lib/queries";
import { IconAlert, IconCheckCircle, IconDownload, IconUsers } from "@/components/icons";
import { btn, StatusChip } from "@/components/ui";

const initialState: BulkAccountState = {};

const REASON: Record<AccountCandidate["status"], string> = {
  ok: "",
  no_phone: "Chưa có SĐT trong hồ sơ lớp",
  phone_taken: "SĐT này đã có tài khoản",
};

/**
 * Tạo tài khoản đăng nhập cho khách đang học, mỗi khách một dòng, tick chọn
 * rồi tạo một lượt.
 *
 * Mật khẩu chỉ hiện đúng một lần sau khi tạo nên màn hình kết quả cho tải
 * file về ngay — đóng trang mà chưa lưu là phải đặt lại mật khẩu từng người.
 */
export default function BulkAccounts({ candidates }: { candidates: AccountCandidate[] }) {
  const [state, formAction, pending] = useActionState(createStudentAccountsAction, initialState);
  const ready = candidates.filter((c) => c.status === "ok");
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(ready.map((c) => c.key)));

  if (state.created?.length) {
    return <CreatedList created={state.created} />;
  }

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        Mọi khách đang học đều đã có tài khoản đăng nhập. Khách mới vào sẽ hiện ở đây.
      </p>
    );
  }

  const toggle = (key: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-ink-600">
        {ready.length > 0
          ? `${ready.length} khách đang học chưa có tài khoản. Tên đăng nhập là số điện thoại của khách, mật khẩu do hệ thống sinh và chỉ hiện một lần sau khi tạo.`
          : "Những khách dưới đây chưa tạo được tài khoản — xem lý do ở từng dòng."}
      </p>

      <ul className="space-y-1.5 max-h-96 overflow-y-auto scroll-thin">
        {candidates.map((c) => {
          const disabled = c.status !== "ok";
          return (
            <li key={c.key}>
              <label
                className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 ${
                  disabled
                    ? "border-navy-100 bg-ivory-50"
                    : "border-navy-100 bg-white cursor-pointer hover:border-wood-300"
                }`}
              >
                <input
                  type="checkbox"
                  name="keys"
                  value={c.key}
                  disabled={disabled}
                  checked={!disabled && chosen.has(c.key)}
                  onChange={() => toggle(c.key)}
                  className="w-[18px] h-[18px] mt-0.5 accent-wood-600 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-ink-900">{c.customerName}</span>
                  <span className="block text-xs text-ink-500 mt-0.5">
                    {c.studentNames.join(", ")} · {c.subjects.join(", ")} · {c.classIds.length} lớp
                  </span>
                </span>
                {disabled ? (
                  <StatusChip tone="amber">{REASON[c.status]}</StatusChip>
                ) : (
                  <span className="text-xs text-ink-600 tabular whitespace-nowrap mt-0.5">
                    {c.login}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      {state.error && (
        <p className="text-sm text-coral-700 flex items-center gap-2">
          <IconAlert className="w-4 h-4 shrink-0" />
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || chosen.size === 0}
        className={`${btn.primary} py-2.5 disabled:opacity-50`}
      >
        <IconUsers className="w-4 h-4" />
        {pending ? "Đang tạo..." : `Tạo ${chosen.size} tài khoản`}
      </button>
    </form>
  );
}

function CreatedList({ created }: { created: CreatedAccount[] }) {
  const [copied, setCopied] = useState(false);
  const lines = created.map((a) => `${a.customerName} — đăng nhập: ${a.login} — mật khẩu: ${a.password}`);

  function download() {
    const csv = [
      "Khách hàng,Tên đăng nhập,Mật khẩu,Số lớp",
      ...created.map((a) => `"${a.customerName}",${a.login},${a.password},${a.classCount}`),
    ].join("\n");
    // ﻿ để Excel mở file không bị lỗi tiếng Việt.
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tai-khoan-hoc-vien-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-mint-700 bg-mint-50 border border-mint-100 rounded-xl px-3.5 py-3 flex items-start gap-2">
        <IconCheckCircle className="w-5 h-5 shrink-0" />
        <span>
          Đã tạo {created.length} tài khoản và gắn sẵn lớp của từng khách.{" "}
          <span className="font-semibold">
            Lưu lại danh sách này trước khi rời trang — mật khẩu không xem lại được.
          </span>{" "}
          Quên thì vào dòng của khách bấm &quot;Đặt lại mật khẩu&quot;.
        </span>
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={download} className={`${btn.primary} py-2.5`}>
          <IconDownload className="w-4 h-4" />
          Tải file gửi khách (CSV)
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(lines.join("\n"));
            } catch {
              window.prompt("Chép danh sách này:", lines.join(" | "));
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className={`${btn.secondary} py-2.5`}
        >
          {copied ? "Đã chép ✓" : "Chép toàn bộ"}
        </button>
      </div>

      <ul className="space-y-1 max-h-80 overflow-y-auto scroll-thin text-sm">
        {created.map((a) => (
          <li
            key={a.login}
            className="flex flex-wrap items-baseline gap-x-3 rounded-lg bg-ivory-50 px-3 py-2"
          >
            <span className="font-medium text-ink-900">{a.customerName}</span>
            <span className="text-ink-600 tabular">{a.login}</span>
            <span className="font-mono text-wood-700">{a.password}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
