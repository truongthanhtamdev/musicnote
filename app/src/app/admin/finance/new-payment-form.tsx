"use client";

import { useActionState, useState } from "react";
import { recordPaymentAction, type PaymentState } from "@/actions/finance";
import { getSuggestedPackagePrice } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { MoneyInput } from "@/components/money-input";
import { IconCheckCircle, IconKey } from "@/components/icons";

const initialState: PaymentState = {};

export interface PayableClass {
  id: number;
  label: string;
  subject: string;
  packageTotal: number | null;
  /** Lớp đã gắn tài khoản đăng nhập của khách chưa. */
  hasAccount: boolean;
  /** SĐT dùng làm tên đăng nhập, null khi hồ sơ lớp chưa có số hợp lệ. */
  loginPhone: string | null;
  /** Tên chủ tài khoản đang dùng số này, nếu số đã có người dùng. */
  existingAccountName: string | null;
}

export default function NewPaymentForm({ classes }: { classes: PayableClass[] }) {
  const [state, formAction, pending] = useActionState(recordPaymentAction, initialState);
  const [amount, setAmount] = useState("");
  const [classId, setClassId] = useState("");
  // Phải là ô tick có điều khiển: defaultChecked chỉ có tác dụng lúc dựng ô
  // lần đầu, nên đổi từ lớp này sang lớp khác thì trạng thái tick cũ dính lại
  // — giáo vụ tưởng đang tạo tài khoản mà thật ra không.
  const [createAccount, setCreateAccount] = useState(true);
  const [formKey, setFormKey] = useState(0);

  // Remount the form (via key) once a save succeeds, resetting all fields —
  // adjusting state during render (rather than in an effect) avoids an
  // extra commit-then-rerender pass, and a ref reset can't run during render.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setAmount("");
      setClassId("");
      setCreateAccount(true);
      setFormKey((k) => k + 1);
    }
  }

  function handleClassChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setClassId(e.target.value);
    const cls = classes.find((c) => c.id === Number(e.target.value));
    // Khách mới thì mặc định tạo tài khoản; số đã thuộc về tài khoản người
    // khác thì để giáo vụ tự tick sau khi nhìn tên.
    setCreateAccount(!cls?.existingAccountName);
    if (cls?.packageTotal) {
      const suggested = getSuggestedPackagePrice(cls.subject, cls.packageTotal);
      if (suggested) setAmount(String(suggested));
    }
  }

  const selected = classes.find((c) => c.id === Number(classId));

  return (
    <div className="space-y-3">
      {/* Tài khoản vừa tạo hiện ngoài form: form bị dựng lại sau khi lưu nên
          để bên trong là mất mật khẩu ngay lúc giáo vụ cần chép. */}
      {state.account && <NewAccountBox account={state.account} />}
      {state.linkedTo && (
        <p className="text-sm text-mint-700 bg-mint-50 border border-mint-100 rounded-xl px-3.5 py-2.5">
          Khách đã có tài khoản <span className="font-semibold">{state.linkedTo.name}</span> (đăng
          nhập {state.linkedTo.login}) — đã gắn thêm {state.linkedTo.classCount} lớp vào đó, mật
          khẩu giữ nguyên.
        </p>
      )}

      <form key={formKey} action={formAction} className="space-y-3">
        <select
          name="class_id"
          defaultValue=""
          onChange={handleClassChange}
          className="w-full rounded-xl border border-navy-200 px-3 py-2 text-sm"
        >
          <option value="">Không gắn lớp cụ thể</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <MoneyInput
            name="amount"
            required
            placeholder="Số tiền (VNĐ)"
            value={amount}
            onValueChange={setAmount}
            className="rounded-xl border border-navy-200 px-3 py-2 text-sm tabular w-full"
          />
          <input
            name="paid_at"
            type="date"
            required
            defaultValue={todayISO()}
            className="rounded-xl border border-navy-200 px-3 py-2 text-sm"
          />
        </div>
        <p className="text-xs text-ink-400 -mt-1">
          Số tiền tự điền theo giá gói (Guitar 20t: 7.5tr, 50t: 15tr · Piano/Violin/Thanh nhạc 20t:
          8tr, 50t: 16tr) — sửa lại nếu giá khác.
        </p>
        <input
          name="note"
          placeholder="Ghi chú (VD: đóng gói 20 tiết)"
          className="w-full rounded-xl border border-navy-200 px-3 py-2 text-sm"
        />

        {selected && !selected.hasAccount && selected.loginPhone && (
          <label className="flex items-start gap-2.5 rounded-xl border border-navy-100 bg-ivory-50 px-3.5 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="create_account"
              checked={createAccount}
              onChange={(e) => setCreateAccount(e.target.checked)}
              className="w-[18px] h-[18px] mt-0.5 accent-wood-600 shrink-0"
            />
            <span className="text-sm text-ink-700">
              {selected.existingAccountName ? (
                <>
                  Gắn lớp này vào tài khoản có sẵn:{" "}
                  <span className="font-semibold">{selected.existingAccountName}</span>
                  <span className="block text-xs text-ink-500 mt-0.5">
                    Số {selected.loginPhone} đã có tài khoản. Chỉ tick khi đúng là khách này —
                    mật khẩu của họ giữ nguyên.
                  </span>
                </>
              ) : (
                <>
                  Tạo luôn tài khoản đăng nhập cho khách
                  <span className="block text-xs text-ink-500 mt-0.5">
                    Tên đăng nhập là {selected.loginPhone}, mật khẩu sinh tự động và hiện ngay sau
                    khi lưu để bạn gửi Zalo cho khách.
                  </span>
                </>
              )}
            </span>
          </label>
        )}
        {selected && !selected.hasAccount && !selected.loginPhone && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Lớp này chưa có số điện thoại nên chưa tạo tài khoản được — thêm SĐT trong trang lớp
            rồi tạo sau.
          </p>
        )}
        {selected?.hasAccount && (
          <p className="text-xs text-ink-400">Khách của lớp này đã có tài khoản đăng nhập.</p>
        )}

        {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
        {state.success && !state.account && !state.linkedTo && (
          <p className="text-sm text-mint-600">Đã ghi nhận thanh toán.</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="bg-wood-500 hover:bg-wood-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
        >
          {pending ? "Đang lưu..." : "Ghi nhận thanh toán"}
        </button>
      </form>
    </div>
  );
}

function NewAccountBox({
  account,
}: {
  account: { name: string; login: string; password: string; classCount: number; codes: string[] };
}) {
  const [copied, setCopied] = useState(false);
  const message =
    `Trung tâm Piano Guitar Đệm Hát gửi anh/chị tài khoản xem lịch học:\n` +
    `Đăng nhập: ${account.login}${
      account.codes.length ? ` (hoặc mã lớp ${account.codes.join(", ")})` : ""
    }\nMật khẩu: ${account.password}\n` +
    `Đăng nhập tại: pianoguitardemhat.com/login`;

  return (
    <div className="rounded-xl border border-mint-200 bg-mint-50 px-3.5 py-3 space-y-2">
      <p className="text-sm text-mint-700 font-semibold flex items-center gap-2">
        <IconCheckCircle className="w-4.5 h-4.5" />
        Đã thu tiền và tạo tài khoản cho {account.name}
      </p>
      <dl className="text-sm text-ink-800 space-y-0.5">
        <div className="flex gap-2">
          <dt className="text-ink-500 w-24 shrink-0">Đăng nhập</dt>
          <dd className="tabular font-medium">{account.login}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-500 w-24 shrink-0">Mật khẩu</dt>
          <dd className="font-mono font-semibold text-wood-700">{account.password}</dd>
        </div>
        {account.codes.length > 0 && (
          <div className="flex gap-2">
            <dt className="text-ink-500 w-24 shrink-0">Hoặc mã lớp</dt>
            <dd className="font-medium">{account.codes.join(", ")}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="text-ink-500 w-24 shrink-0">Đã gắn</dt>
          <dd>{account.classCount} lớp</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(message);
          } catch {
            window.prompt("Chép tin nhắn gửi khách:", message);
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-wood-700 hover:text-wood-800"
      >
        <IconKey className="w-4 h-4" />
        {copied ? "Đã chép ✓" : "Chép tin nhắn gửi khách"}
      </button>
      <p className="text-xs text-ink-500">
        Mật khẩu chỉ hiện lần này. Quên thì vào Tài khoản học viên bấm &quot;Đặt lại mật khẩu&quot;.
      </p>
    </div>
  );
}
