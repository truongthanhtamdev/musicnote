import { getSession } from "@/lib/auth";

const SAMPLE = `TenHocSinh,SDT,PhuHuynh,TrinhDo,MonHoc,NgonNgu,Thu,GioBatDau,ThoiLuongPhut,EmailGiaoVien,GhiChu
Be Minh Khang,0912000111,Chi Lan (me be Khang),Co ban,Guitar,vi,T3,19:00,60,long.guitar@musicnote.local,
Chi Thu Ha,0912000222,,Trung cap,Piano,vi,T5,20:00,60,,Lop moi chua xep GV
Ms. Sarah,0912000444,,Co ban,Guitar,en,T4,18:00,60,,Hoc vien noi tieng Anh
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
