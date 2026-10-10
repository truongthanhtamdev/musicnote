"use client";

import { useMemo, useState, useTransition } from "react";
import { savePlannedSessionsAction } from "@/actions/classes";
import { Modal } from "@/components/modal";
import { TimeSelect } from "@/components/time-select";
import { btn, field } from "@/components/ui";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function monthLabel(key: string) {
  return `Tháng ${Number(key.slice(5))}/${key.slice(0, 4)}`;
}

/**
 * Xếp lịch theo tháng cho lớp linh động: bấm chọn các ngày học trong tháng,
 * mỗi ngày một giờ (mặc định theo giờ chọn ở trên). Ngày đã qua không sửa —
 * buổi đó điểm danh như thường.
 */
export function MonthPlanner({
  classId,
  name,
  today,
  planned,
  defaultTime,
  compact = false,
}: {
  classId: number;
  name: string;
  /** YYYY-MM-DD theo giờ trung tâm (server truyền xuống cho khỏi lệch múi giờ). */
  today: string;
  /** Buổi đã hẹn, từ đầu tháng này tới cuối tháng sau. */
  planned: { session_date: string; start_time: string }[];
  defaultTime: string;
  compact?: boolean;
}) {
  const months = useMemo(() => {
    const d = new Date(`${today.slice(0, 7)}-01T00:00:00`);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return [monthKey(d), monthKey(next)];
  }, [today]);

  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(months[0]);
  const [defTime, setDefTime] = useState(defaultTime || "19:00");
  const [picked, setPicked] = useState<Map<string, string>>(
    () => new Map(planned.map((p) => [p.session_date, p.start_time]))
  );
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const upcoming = planned.filter((p) => p.session_date >= today);

  // Lưới tháng, tuần bắt đầu từ thứ Hai.
  const cells = useMemo(() => {
    const first = new Date(`${month}-01T00:00:00`);
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(`${month}-${pad(d)}`);
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const inMonth = [...picked.entries()].filter(([d]) => d.startsWith(month) && d >= today).sort(([a], [b]) => a.localeCompare(b));

  function toggle(date: string) {
    setSaved(null);
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(date)) next.delete(date);
      else next.set(date, defTime);
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await savePlannedSessionsAction(
        classId,
        month,
        inMonth.map(([date, time]) => ({ date, time }))
      );
      if (res.error) setError(res.error);
      else setSaved(`Đã lưu ${inMonth.length} buổi ${monthLabel(month).toLowerCase()}.`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "font-semibold text-wood-600 hover:text-wood-700"
            : "w-full rounded-xl border border-wood-200 bg-wood-50 px-3 py-2 text-sm font-semibold text-wood-700 hover:bg-wood-100"
        }
      >
        📅 Xếp lịch tháng
        {upcoming.length > 0 && (
          <span className="font-normal text-ink-500">
            {" "}
            · {upcoming.length} buổi tới
          </span>
        )}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Lịch học tháng — ${name}`}
        subtitle="Bấm vào ngày để thêm / bỏ buổi học. Buổi đã xếp hiện ở trang Hôm nay đúng ngày đó và được nhắc lịch như lớp cố định."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {months.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMonth(m);
                  setSaved(null);
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold border ${
                  m === month ? "bg-wood-500 border-wood-500 text-white" : "bg-white border-navy-200 text-ink-700"
                }`}
              >
                {monthLabel(m)}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-1.5 text-sm text-ink-600">
              Giờ mặc định
              <TimeSelect
                value={defTime}
                onChange={(e) => setDefTime(e.target.value)}
                className={`${field} w-auto py-1.5`}
                aria-label="Giờ học mặc định"
              />
            </label>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <span key={w} className="text-[11px] font-semibold text-ink-400 py-1">
                {w}
              </span>
            ))}
            {cells.map((date, i) => {
              if (!date) return <span key={`e${i}`} />;
              const past = date < today;
              const on = picked.has(date);
              return (
                <button
                  key={date}
                  type="button"
                  disabled={past}
                  onClick={() => toggle(date)}
                  className={`aspect-square rounded-lg text-sm tabular flex flex-col items-center justify-center leading-tight transition ${
                    on
                      ? "bg-wood-500 text-white font-semibold"
                      : past
                        ? "text-ink-300"
                        : "bg-ivory-50 text-ink-800 hover:bg-wood-50 border border-navy-100"
                  } ${date === today && !on ? "ring-1 ring-wood-400" : ""}`}
                >
                  {Number(date.slice(8))}
                  {on && <span className="text-[9px] opacity-90">{picked.get(date)}</span>}
                </button>
              );
            })}
          </div>

          {inMonth.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-ink-500">
                {inMonth.length} buổi {monthLabel(month).toLowerCase()} — đổi giờ từng buổi nếu cần:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {inMonth.map(([date, time]) => (
                  <li key={date} className="flex items-center gap-2 text-sm">
                    <span className="tabular w-24 text-ink-700">
                      {WEEKDAYS[(new Date(`${date}T00:00:00`).getDay() + 6) % 7]} {date.slice(8)}/{date.slice(5, 7)}
                    </span>
                    <TimeSelect
                      value={time}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSaved(null);
                        setPicked((prev) => new Map(prev).set(date, v));
                      }}
                      className={`${field} w-auto py-1`}
                      aria-label={`Giờ học ngày ${date}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-coral-700">{error}</p>}
          {saved && <p className="text-sm text-mint-700">{saved}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={pending} onClick={save} className={btn.primary}>
              {pending ? "Đang lưu..." : `Lưu lịch ${monthLabel(month).toLowerCase()}`}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={btn.ghost}>
              Đóng
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
