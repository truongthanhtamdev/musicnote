import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { computePayroll } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const rows = computePayroll(from, to);

  const header = "Giao vien,So buoi da day,Buoi thu,Don gia/buoi,Thanh tien\n";
  const body = rows
    .map((r) =>
      [
        `"${r.teacher_name.replace(/"/g, '""')}"`,
        r.completed_sessions,
        r.trial_sessions,
        r.pay_per_session || 0,
        r.total_pay,
      ].join(",")
    )
    .join("\n");

  const csv = "﻿" + header + body + "\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="luong_${from}_${to}.csv"`,
    },
  });
}
