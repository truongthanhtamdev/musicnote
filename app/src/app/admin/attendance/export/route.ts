import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { listAttendance, sessionNumberMap } from "@/lib/queries";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/types";

/** Wraps a value so Excel keeps it as one field even with commas/quotes/newlines inside. */
function cell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "coordinator")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const teacherIdRaw = searchParams.get("teacherId");
  const teacherId = teacherIdRaw ? Number(teacherIdRaw) : undefined;
  const status = searchParams.get("status");

  // Same filtering as the page, so the file matches what's on screen.
  const all = listAttendance({ teacherId, from, to });
  const rows = status
    ? all.filter((a) => (status === "abnormal" ? a.status !== "completed" : a.status === "completed"))
    : all;
  // Numbered off the unfiltered set so "Buổi 5" stays 5 even when the view is
  // narrowed to one status.
  const numbers = sessionNumberMap([...new Set(all.map((r) => r.class_id))]);

  const header = [
    "Ngay",
    "Hoc vien",
    "Giao vien",
    "Trang thai",
    "Buoi thu",
    "Buoi hoc thu",
    "Diem danh Facebook",
    "Gio diem danh",
    "Noi dung bai hoc",
    "Ghi chu",
    "Ngay hoc bu",
    "Gio hoc bu",
  ].join(",");

  const body = rows
    .map((r) =>
      [
        cell(r.session_date),
        cell(r.student_name),
        cell(r.teacher_name),
        cell(ATTENDANCE_STATUS_LABELS[r.status]),
        cell(r.is_trial ? "" : (numbers.get(r.id) ?? "")),
        cell(r.is_trial ? "x" : ""),
        cell(r.fb_checkin_confirmed ? "x" : ""),
        cell(r.check_in_time),
        cell(r.lesson_content),
        cell(r.note),
        cell(r.rescheduled_to_date),
        cell(r.rescheduled_to_time),
      ].join(",")
    )
    .join("\n");

  // Leading BOM so Excel opens Vietnamese accents correctly.
  const csv = "﻿" + header + "\n" + body + "\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="diem_danh_${from}_${to}.csv"`,
    },
  });
}
