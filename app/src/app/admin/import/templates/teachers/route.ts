import { getSession } from "@/lib/auth";

const SAMPLE = `Ten,Email,SDT,LuongMoiBuoi,NgonNgu,MatKhau
Nguyen Van A,vana.guitar@musicnote.local,0901111111,125000,vi,
Tran Thi B,thib.guitar@musicnote.local,0902222222,150000,"vi,en",
`;

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response("﻿" + SAMPLE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mau_giao_vien.csv"',
    },
  });
}
