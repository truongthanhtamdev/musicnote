"use client";

import { useActionState, useState } from "react";
import {
  createStudentAccountsAction,
  type BulkAccountState,
  type CreatedAccount,
  type LinkedAccount,
} from "@/actions/students";
import type { AccountCandidate } from "@/lib/queries";
import { IconAlert, IconCheckCircle, IconDownload, IconUsers } from "@/components/icons";
import { btn, StatusChip } from "@/components/ui";

const initialState: BulkAccountState = {};

const REASON: Record<AccountCandidate["status"], string> = {
  ok: "",
  no_phone: "Chưa có SĐT trong hồ sơ lớp",
  duplicate_phone: "Trùng SĐT với khách ở trên",
  link_existing: "",
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
  // Chỉ tick sẵn người tạo tài khoản mới. Người gắn vào tài khoản có sẵn để
  // giáo vụ tự tick sau khi nhìn tên tài khoản — hai nhà xài chung một số
  // điện thoại mà gắn nhầm là khách này thấy lớp của khách kia.
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(ready.map((c) => c.key)));

  if (state.created?.length || state.linked?.length) {
    return <CreatedList created={state.created ?? []} linked={state.linked ?? []} />;
  }

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        Mọi khách đang học đều đã có tài khoản đăng nhập. Khách mới vào sẽ hiện ở đây.
      </p>
    );
  }

  const chosenList = candidates.filter((c) => chosen.has(c.key));
  const newCount = chosenList.filter((c) => c.status === "ok").length;
  const linkCount = chosenList.filter((c) => c.status === "link_existing").length;

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
        {candidates.some((c) => c.status === "link_existing") &&
          " Dòng ghi “Gắn vào tài khoản …” là khách đã có tài khoản rồi, tick để gắn thêm lớp mới vào đúng tài khoản đó."}
      </p>

      <ul className="space-y-1.5 max-h-96 overflow-y-auto scroll-thin">
        {candidates.map((c) => {
          const disabled = c.status === "no_phone" || c.status === "duplicate_phone";
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
                ) : c.existingAccount ? (
                  <span className="text-xs text-right whitespace-nowrap mt-0.5">
                    <span className="block text-ink-600 tabular">{c.login}</span>
                    <span className="block text-mint-700 font-semibold">
                      Gắn vào tài khoản {c.existingAccount.name}
                    </span>
                  </span>
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
        {pending ? "Đang xử lý..." : `${newCount > 0 ? `Tạo ${newCount} tài khoản` : "Gắn lớp"}${
          linkCount > 0 && newCount > 0 ? ` + gắn ${linkCount} lớp cũ` : linkCount > 0 ? ` cho ${linkCount} khách` : ""
        }`}
      </button>
    </form>
  );
}

function CreatedList({
  created,
  linked,
}: {
  created: CreatedAccount[];
  linked: LinkedAccount[];
}) {
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
          {created.length > 0 && `Đã tạo ${created.length} tài khoản và gắn sẵn lớp của từng khách. `}
          {linked.length > 0 &&
            `Đã gắn lớp mới vào ${linked.length} tài khoản có sẵn (${linked
              .map((a) => a.accountName)
              .join(", ")}) — mật khẩu của họ giữ nguyên. `}
          {created.length > 0 && (
            <>
              <span className="font-semibold">
                Lưu lại danh sách này trước khi rời trang — mật khẩu không xem lại được.
              </span>{" "}
              Quên thì vào dòng của khách bấm &quot;Đặt lại mật khẩu&quot;.
            </>
          )}
        </span>
      </p>

      {created.length > 0 && (
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
      )}

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
