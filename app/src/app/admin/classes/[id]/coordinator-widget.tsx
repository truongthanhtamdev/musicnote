"use client";

import { useState, useTransition } from "react";
import { awardMissingForClassAction, setClassCoordinatorAction } from "@/actions/classes";
import type { CustomerBonusStatus } from "@/lib/bonus";
import { formatVND } from "@/lib/format";

/**
 * Ô gán giáo vụ phụ trách cho lớp có sẵn. Chọn xong lưu luôn.
 *
 * Không gán thì mọi khoản thưởng của khách này (học thử + chốt lớp) không ghi
 * cho ai cả — hệ thống thà thiếu còn hơn ghi nhầm người.
 */
export default function CoordinatorWidget({
  classId,
  current,
  staff,
  status,
}: {
  classId: number;
  current: number | null;
  staff: { id: number; name: string }[];
  status: CustomerBonusStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div>
      <select
        value={current ?? ""}
        disabled={pending}
        onChange={(e) => {
          const value = e.target.value ? Number(e.target.value) : null;
          startTransition(async () => {
            try {
              const r = await setClassCoordinatorAction(classId, value);
              setError(null);
              setNotice(
                r.movedCount > 0
                  ? `Đã chuyển ${r.movedCount} khoản thưởng (${formatVND(r.movedTotal)}) sang người này.`
                  : "Đã lưu."
              );
            } catch {
              setError("Không lưu được — bạn cần quyền Quản lý trở lên.");
            }
          });
        }}
        className="w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 disabled:opacity-60"
      >
        <option value="">— Chưa gán ai —</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-coral-600 mt-1.5">{error}</p>}
      {notice && !error && <p className="text-xs text-mint-700 mt-1.5">{notice}</p>}
      <p className="text-xs text-ink-500 mt-2">
        Thưởng học thử và chốt lớp của khách này ghi cho người được gán. Đổi người thì các khoản
        đã ghi trước đó cũng chuyển theo.
      </p>

      {/* Tình trạng thưởng của khách: trả lời thẳng "sao chưa nhảy tiền". */}
      <div className="mt-4 rounded-xl border border-navy-100 bg-ivory-50 p-3 text-sm space-y-1.5">
        <p className="font-semibold text-ink-900">Thưởng của khách này</p>

        {status.trials.length === 0 ? (
          <p className="text-amber-700">
            Học thử: chưa có buổi nào được điểm danh là <b>học thử</b>. Nếu khách đã học thử, vào
            Lịch & điểm danh sửa buổi đó thành &ldquo;buổi thứ 0&rdquo;.
          </p>
        ) : (
          status.trials.map((t) => (
            <p key={t.attendanceId} className={t.holder ? "text-ink-700" : "text-amber-700"}>
              Học thử {t.date}:{" "}
              {t.holder ? `${formatVND(t.amount ?? 0)} → ${t.holder}` : "chưa ghi thưởng"}
            </p>
          ))
        )}

        {status.conversion ? (
          <p className="text-ink-700">
            Chốt lớp: {formatVND(status.conversion.amount)} → {status.conversion.holder}
          </p>
        ) : status.converted ? (
          <p className="text-amber-700">Chốt lớp: khách đã chốt nhưng chưa ghi thưởng</p>
        ) : (
          <p className="text-ink-500">
            Chốt lớp: chưa — ghi học phí hoặc đổi trạng thái lớp sang Đang học thì sẽ tự cộng.
          </p>
        )}

        {current != null &&
          (status.trials.some((t) => !t.holder) || (!status.conversion && status.converted)) && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await awardMissingForClassAction(classId);
                  setNotice(
                    r.trials + r.conversion > 0
                      ? `Đã ghi bù ${r.trials} khoản học thử, ${r.conversion} khoản chốt lớp.`
                      : "Không có khoản nào ghi được — kiểm tra người phụ trách."
                  );
                })
              }
              className="mt-1 rounded-lg bg-wood-500 hover:bg-wood-600 disabled:opacity-60 text-white px-3 py-1.5 text-sm font-semibold"
            >
              Ghi thưởng còn thiếu cho người phụ trách
            </button>
          )}
        {current == null && (
          <p className="text-amber-700">Chưa gán người phụ trách nên chưa ghi được khoản nào.</p>
        )}
      </div>
    </div>
  );
}
