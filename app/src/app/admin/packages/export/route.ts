import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getTuitionStatusForClasses } from "@/lib/queries";
import { formatClassSchedule } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { filterPackageRows, listPackageRows, type PackageSP } from "../filters";

/** Wraps a value so Excel keeps it as one field even with commas/quotes/newlines inside. */
function cell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const sp: PackageSP = {
    q: searchParams.get("q") || undefined,
    subject: searchParams.get("subject") || undefined,
    teacherId: searchParams.get("teacherId") || undefined,
    pkg: searchParams.get("pkg") || undefined,
    remaining: searchParams.get("remaining") || undefined,
  };
  const rows = filterPackageRows(listPackageRows(), sp);
  const tuition = getTuitionStatusForClasses(rows.map((r) => r.cls));

  const header = [
    "Hoc vien",
    "Khach hang",
    "SDT",
    "Facebook",
    "Bo mon",
    "Giao vien",
    "Lich hoc",
    "Goi hoc (tiet)",
    "Da hoc",
    "Con lai",
    "Da thu (VND)",
    "Con thieu (VND)",
    "Trang thai",
  ];

  const lines = [header.join(",")];
  for (const { cls, progress } of rows) {
    const owed = tuition.get(cls.id);
    lines.push(
      [
        cell(cls.student_name),
        cell(cls.guardian_name),
        cell(cls.student_phone),
        cell(cls.facebook_url),
        cell(cls.subject),
        cell(cls.teacher_name || "Chưa xếp GV"),
        cell(formatClassSchedule(cls)),
        progress ? progress.total : cell("Chưa có gói"),
        progress ? progress.used : "",
        progress ? progress.remaining : "",
        owed?.paid ?? 0,
        owed?.outstanding ?? 0,
        cell(
          !progress
            ? "Chưa có gói"
            : progress.remaining === 0
              ? "Hết gói"
              : progress.remaining <= 5
                ? "Sắp hết gói"
                : "Bình thường"
        ),
      ].join(",")
    );
  }

  const csv = "﻿" + lines.join("\n") + "\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hoc_vien_goi_hoc_${todayISO()}.csv"`,
    },
  });
}
