import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { listLeads } from "@/lib/queries";
import { LEAD_STATUS_LABELS, LEARNING_MODE_LABELS } from "@/lib/types";

function cell(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  return `"${String(value).replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "coordinator")) {
    return new Response("Forbidden", { status: 403 });
  }

  // Nhận đúng bộ lọc của trang danh sách để "Xuất CSV" ra đúng những dòng
  // đang xem, chứ không phải toàn bộ danh sách.
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const leads = listLeads({
    from,
    to,
    search: searchParams.get("q") || undefined,
    status: searchParams.get("status") || undefined,
    source: searchParams.get("source") || undefined,
    area: searchParams.get("area") || undefined,
    learningMode: searchParams.get("mode") || undefined,
    subject: searchParams.get("subject") || undefined,
    dueOnly: searchParams.get("due") === "1",
  });

  const lines: string[] = [];
  lines.push(
    [
      "Ten",
      "SDT Zalo",
      "Ten Facebook",
      "Link Facebook",
      "Khu vuc",
      "Mon hoc",
      "Hinh thuc hoc",
      "Nhu cau",
      "Nguon",
      "Ngay nhan",
      "Trang thai",
      "Hen lien he lai",
      "Phu trach",
      "Doanh thu du kien",
      "Doanh thu da thu",
      "Ly do khong chot",
      "Ghi chu",
    ].join(",")
  );

  for (const l of leads) {
    lines.push(
      [
        cell(l.name),
        cell(l.phone),
        cell(l.fb_name),
        cell(l.fb_url),
        cell(l.area),
        cell(l.subject),
        cell(LEARNING_MODE_LABELS[l.learning_mode]),
        cell(l.need),
        cell(l.source),
        cell(l.received_at),
        cell(LEAD_STATUS_LABELS[l.status]),
        cell(l.next_follow_up),
        cell(l.owner_name),
        l.expected_value ?? "",
        l.revenue,
        cell(l.lost_reason),
        cell(l.notes),
      ].join(",")
    );
  }

  const csv = "﻿" + lines.join("\n") + "\n";
  const suffix = from && to ? `_${from}_${to}` : "";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="khach_hang_tiem_nang${suffix}.csv"`,
    },
  });
}
