import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { listPayments, listExpenses, getRevenueSummary } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const payments = listPayments(from, to);
  const expenses = listExpenses(from, to);
  const summary = getRevenueSummary(from, to);

  const lines: string[] = [];
  lines.push(`Doanh thu tu ${from} den ${to}`);
  lines.push("");
  lines.push("KHOAN THU");
  lines.push("Ngay,Hoc vien,So tien,Ghi chu");
  for (const p of payments) {
    lines.push(
      [p.paid_at, `"${(p.student_name || "").replace(/"/g, '""')}"`, p.amount, `"${(p.note || "").replace(/"/g, '""')}"`].join(",")
    );
  }
  lines.push("");
  lines.push("CHI PHI");
  lines.push("Ngay,Loai chi phi,So tien,Ghi chu");
  for (const e of expenses) {
    lines.push(
      [e.expense_date, `"${e.category.replace(/"/g, '""')}"`, e.amount, `"${(e.note || "").replace(/"/g, '""')}"`].join(",")
    );
  }
  lines.push("");
  lines.push("TONG KET");
  lines.push(`Tong doanh thu,${summary.totalRevenue}`);
  lines.push(`Tong luong giao vien,${summary.totalPayroll}`);
  lines.push(`Tong chi phi khac,${summary.totalExpenses}`);
  lines.push(`Loi nhuan,${summary.profit}`);

  const csv = "﻿" + lines.join("\n") + "\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="doanh_thu_${from}_${to}.csv"`,
    },
  });
}
