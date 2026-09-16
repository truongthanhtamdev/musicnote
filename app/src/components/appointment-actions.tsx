"use client";

import { useState, useTransition } from "react";
import {
  deleteAppointmentAction,
  rescheduleAppointmentAction,
  setAppointmentStatusAction,
} from "@/actions/appointments";
import type { AppointmentStatus } from "@/lib/types";

export default function AppointmentActions({
  id,
  status,
  startsAt,
}: {
  id: number;
  status: AppointmentStatus;
  startsAt: string;
}) {
  const [pending, start] = useTransition();
  const [showMove, setShowMove] = useState(false);
  const [date, setDate] = useState(startsAt.slice(0, 10));
  const [time, setTime] = useState(startsAt.slice(11, 16));

  const set = (s: AppointmentStatus) => start(() => setAppointmentStatusAction(id, s));

  if (showMove) {
    return (
      <form
        action={(fd) => {
          fd.set("id", String(id));
          start(async () => {
            await rescheduleAppointmentAction({}, fd);
            setShowMove(false);
          });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          type="date"
          name="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input w-auto py-1.5"
        />
        <input
          type="time"
          name="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="input w-auto py-1.5"
        />
        <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
          Lưu giờ mới
        </button>
        <button type="button" onClick={() => setShowMove(false)} className="btn btn-ghost btn-sm">
          Thôi
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status === "scheduled" ? (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => set("done")}
            className="btn btn-primary btn-sm"
          >
            Đã xong
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowMove(true)}
            className="btn btn-ghost btn-sm"
          >
            Dời giờ
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => set("no_show")}
            className="btn btn-ghost btn-sm"
          >
            Khách không đến
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => set("canceled")}
            className="btn btn-ghost btn-sm"
          >
            Huỷ
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => set("scheduled")}
            className="btn btn-ghost btn-sm"
          >
            Mở lại
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm("Xoá hẳn lịch hẹn này?")) start(() => deleteAppointmentAction(id));
            }}
            className="px-2 py-1 text-[12px] text-muted hover:text-rose-600"
          >
            Xoá
          </button>
        </>
      )}
    </div>
  );
}
