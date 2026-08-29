"use client";

import { useTransition } from "react";
import { DAY_LABELS, DAY_ORDER, type AvailabilityRow } from "@/lib/types";
import { toggleAvailabilitySlotAction, clearDayAvailabilityAction } from "@/actions/availability";

const SLOTS: string[] = [];
for (let h = 7; h < 22; h++) {
  SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

export function AvailabilityGrid({
  slots,
  interactive = false,
}: {
  slots: AvailabilityRow[];
  interactive?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const filled = new Set(slots.map((s) => `${s.day_of_week}-${s.start_time}`));

  return (
    <div>
      {interactive && (
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded bg-emerald-400" /> Rảnh, có thể nhận
            lớp
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200" />{" "}
            Bận
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
      <table className="border-collapse text-xs w-full">
        <thead>
          <tr>
            <th className="w-14 sticky left-0 bg-white"></th>
            {DAY_ORDER.map((d) => (
              <th key={d} className="px-1 py-1 font-medium text-slate-600">
                <div className="flex flex-col items-center gap-0.5">
                  <span>{DAY_LABELS[d]}</span>
                  {interactive && (
                    <button
                      type="button"
                      onClick={() => startTransition(() => clearDayAvailabilityAction(d))}
                      className="text-[10px] text-slate-400 hover:text-red-500"
                      title="Xoá cả ngày"
                    >
                      xoá
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((time) => (
            <tr key={time}>
              <td className="text-slate-500 pr-2 text-right sticky left-0 bg-white">{time}</td>
              {DAY_ORDER.map((d) => {
                const key = `${d}-${time}`;
                const on = filled.has(key);
                return (
                  <td key={key} className="p-0.5">
                    <button
                      type="button"
                      disabled={!interactive || isPending}
                      onClick={() =>
                        startTransition(() => toggleAvailabilitySlotAction(d, time))
                      }
                      className={`w-full h-6 rounded transition ${
                        on ? "bg-emerald-400" : "bg-slate-100"
                      } ${
                        interactive
                          ? "hover:opacity-70 active:opacity-50 cursor-pointer"
                          : "cursor-default"
                      }`}
                      aria-label={`${DAY_LABELS[d]} ${time}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
