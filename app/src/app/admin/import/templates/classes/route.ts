import { getSession } from "@/lib/auth";

const SAMPLE = `TenHocSinh,SDT,TrinhDo,Thu,GioBatDau,ThoiLuongPhut,EmailGiaoVien,GhiChu
Be Minh Khang,0912000111,Co ban,T3,19:00,45,long.guitar@musicnote.local,
Chi Thu Ha,0912000222,Trung cap,T5,20:00,60,,Lop moi chua xep GV
`;

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "coordinator")) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response("﻿" + SAMPLE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mau_lop_hoc.csv"',
    },
  });
}
