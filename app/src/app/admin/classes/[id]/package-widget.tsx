"use client";

import { useActionState, useState, useTransition } from "react";
import {
  saveClassPackageAction,
  setPackageAction,
  renewPackageAction,
  sharePackageAction,
} from "@/actions/classes";
import type { FormState } from "@/actions/teachers";
import { UsedSessionsEditor } from "@/components/used-sessions-editor";
import { PACKAGE_OPTIONS, getSuggestedPackagePrice } from "@/lib/types";
import { todayISO, formatVND } from "@/lib/format";
import type { PackageProgress } from "@/lib/queries";

const initialState: FormState = {};

export default function PackageWidget({
  classId,
  subject,
  progress,
  siblingsWithPackage,
  canRecordPayment,
}: {
  classId: number;
  subject: string;
  progress: PackageProgress | null;
  siblingsWithPackage: { id: number; label: string; progress: PackageProgress }[];
  canRecordPayment: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [state, formAction, saving] = useActionState(saveClassPackageAction, initialState);
  const [formKey, setFormKey] = useState(0);
  const [total, setTotal] = useState(progress ? String(progress.total) : "");
  const [used, setUsed] = useState(progress ? String(progress.used) : "0");
  const [amount, setAmount] = useState("");

  // Lưu xong thì đồng bộ lại các ô theo số liệu mới từ server và xoá ô học
  // phí, tránh bấm lưu lần nữa là ghi trùng một khoản thu. Chỉnh state ngay
  // trong lúc render (thay vì dùng effect) đỡ được một vòng render thừa.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setTotal(progress ? String(progress.total) : total);
      setUsed(progress ? String(progress.used) : used);
      setAmount("");
      setFormKey((k) => k + 1);
    }
  }

  // Đổi số buổi đăng ký thì gợi ý luôn học phí theo bảng giá — admin sửa lại
  // nếu khách được giá khác.
  function pickTotal(value: string) {
    setTotal(value);
    const suggested = getSuggestedPackagePrice(subject, Number(value));
    if (suggested) setAmount(String(suggested));
  }

  const suggested = getSuggestedPackagePrice(subject, Number(total));

  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-4">
      <h2 className="font-semibold text-ink-900 mb-3">Gói học &amp; học phí</h2>

      {progress ? (
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-1 gap-2">
            <UsedSessionsEditor progress={progress} size="sm" />
            <span
              className={`text-xs font-medium shrink-0 ${
                progress.remaining <= 3 ? "text-amber-600" : "text-ink-400"
              }`}
            >
              Còn {progress.remaining} tiết
            </span>
          </div>
          <div className="h-2 rounded-full bg-ivory-200 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                progress.remaining <= 3 ? "bg-amber-500" : "bg-wood-500"
              }`}
              style={{ width: `${Math.min(100, (progress.used / progress.total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-ink-400 mt-1">Bắt đầu tính từ {progress.startedAt}</p>
          {progress.sharedWith.length > 0 && (
            <p className="text-xs text-wood-600 mt-1">
              Dùng chung gói với {progress.sharedWith.length} lịch học khác của học viên này — học
              buổi nào cũng trừ chung vào {progress.total} tiết trên.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-500 mb-4">Lớp chưa đăng ký gói — nhập bên dưới để đăng ký.</p>
      )}

      <form key={formKey} action={formAction} className="space-y-3 border-t border-navy-100 pt-3">
        <input type="hidden" name="class_id" value={classId} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-500 mb-1" htmlFor="pk-total">
              Số buổi đã đăng ký
            </label>
            <input
              id="pk-total"
              name="total_sessions"
              type="number"
              min={1}
              required
              value={total}
              onChange={(e) => pickTotal(e.target.value)}
              placeholder="VD: 50"
              className="w-full rounded-xl border border-navy-200 px-3 py-2 text-sm tabular"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1" htmlFor="pk-used">
              Đã học đến hiện tại
            </label>
            <input
              id="pk-used"
              name="used_sessions"
              type="number"
              min={0}
              value={used}
              onChange={(e) => setUsed(e.target.value)}
              className="w-full rounded-xl border border-navy-200 px-3 py-2 text-sm tabular"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-400">Chọn nhanh:</span>
          {PACKAGE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => pickTotal(String(n))}
              className={`text-xs rounded-lg px-2 py-1 border ${
                total === String(n)
                  ? "border-wood-400 bg-wood-50 text-wood-700 font-semibold"
                  : "border-navy-200 text-ink-600 hover:bg-ivory-100"
              }`}
            >
              {n} tiết
            </button>
          ))}
        </div>

        {canRecordPayment && (
          <>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs text-ink-500 mb-1" htmlFor="pk-amount">
                  Học phí đã đóng
                </label>
                <input
                  id="pk-amount"
                  name="amount"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Bỏ trống nếu chưa đóng"
                  className="w-full rounded-xl border border-navy-200 px-3 py-2 text-sm tabular"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-500 mb-1" htmlFor="pk-paid-at">
                  Ngày đóng
                </label>
                <input
                  id="pk-paid-at"
                  name="paid_at"
                  type="date"
                  defaultValue={todayISO()}
                  className="w-full rounded-xl border border-navy-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <input
              name="note"
              placeholder="Ghi chú khoản thu (VD: đóng gói 50 tiết)"
              className="w-full rounded-xl border border-navy-200 px-3 py-2 text-sm"
            />
            <p className="text-xs text-ink-400 -mt-1">
              {suggested
                ? `Giá gợi ý cho ${subject} ${total} tiết: ${formatVND(suggested)} — sửa lại nếu khác.`
                : "Bỏ trống ô học phí nếu chỉ muốn cập nhật số buổi."}
            </p>
          </>
        )}

        {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
        {state.success && (
          <p className="text-sm text-mint-600">Đã lưu gói học{canRecordPayment ? " và học phí" : ""}.</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={saving || isPending}
            className="bg-wood-500 hover:bg-wood-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
          >
            {saving ? "Đang lưu..." : progress ? "Cập nhật gói học" : "Đăng ký gói học"}
          </button>
          {progress && (
            <>
              <button
                type="button"
                disabled={isPending || saving}
                onClick={() => {
                  if (confirm(`Đặt lại thành gói mới ${progress.total} tiết, tính từ hôm nay?`)) {
                    startTransition(() => renewPackageAction(progress.packageId, progress.total));
                  }
                }}
                className="text-sm border border-navy-200 text-ink-600 hover:bg-ivory-100 rounded-lg px-3 py-1.5"
              >
                Gia hạn (làm mới)
              </button>
              <button
                type="button"
                disabled={isPending || saving}
                onClick={() => {
                  if (confirm("Bỏ gói học của lớp này? Lịch sử điểm danh vẫn giữ nguyên.")) {
                    startTransition(() => setPackageAction(classId, null));
                  }
                }}
                className="text-sm text-ink-400 hover:text-coral-600 rounded-lg px-2 py-1.5"
              >
                Bỏ gói
              </button>
            </>
          )}
        </div>
      </form>

      {siblingsWithPackage.length > 0 && (
        <div className="mt-3 pt-3 border-t border-navy-100">
          <label className="block text-xs text-ink-500 mb-1">
            Học viên này có lịch học khác đã có gói — dùng chung gói đó (học 2-3 buổi/tuần cùng trừ
            vào 1 gói):
          </label>
          <select
            defaultValue=""
            disabled={isPending}
            onChange={(e) => {
              if (e.target.value)
                startTransition(() => sharePackageAction(classId, Number(e.target.value)));
            }}
            className="w-full rounded-xl border border-navy-200 px-2 py-1.5 text-sm"
          >
            <option value="">-- Chọn lịch học để dùng chung gói --</option>
            {siblingsWithPackage.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} (đã dùng {s.progress.used}/{s.progress.total} tiết)
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
