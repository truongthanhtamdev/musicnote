"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/guard";

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Toggle a half-hour slot between free (default) and marked busy. */
export async function toggleBusySlotAction(dayOfWeek: number, startTime: string) {
  const session = await assertRole(["teacher"]);
  const teacherId = session.userId;
  const endTime = addMinutes(startTime, 30);

  const existing = db
    .prepare(
      "SELECT id FROM availability WHERE teacher_id = ? AND day_of_week = ? AND start_time = ?"
    )
    .get(teacherId, dayOfWeek, startTime) as { id: number } | undefined;

  if (existing) {
    db.prepare("DELETE FROM availability WHERE id = ?").run(existing.id);
  } else {
    db.prepare(
      "INSERT INTO availability (teacher_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)"
    ).run(teacherId, dayOfWeek, startTime, endTime);
  }

  revalidatePath("/teacher/availability");
  revalidatePath("/admin/assign");
}

/** Clear every busy mark for one day, i.e. mark the whole day free. */
export async function clearDayBusyAction(dayOfWeek: number) {
  const session = await assertRole(["teacher"]);
  db.prepare("DELETE FROM availability WHERE teacher_id = ? AND day_of_week = ?").run(
    session.userId,
    dayOfWeek
  );
  revalidatePath("/teacher/availability");
  revalidatePath("/admin/assign");
}
