import { getSession } from "@/lib/auth";

const SAMPLE = `Ten,SDT,TenFacebook,LinkFacebook,KhuVuc,MonHoc,HinhThucHoc,NhuCau,Nguon,NgayNhan,GhiChu
Chị Lan,0901234567,Lan Nguyen,https://facebook.com/lan.nguyen,Quận 7,Guitar,1 kèm 1 tại nhà,Học đệm hát cho con 12 tuổi,Facebook Ads,2026-09-01,Rảnh tối T3-T5
Anh Huy,0912345678,Huy Tran,,Thủ Đức,Guitar,Học nhóm tại quán cà phê,Đi làm về muốn học nhóm cho vui,Inbox Fanpage,2026-09-02,
Bạn Minh,0987654321,,,Online,Piano,Học online,Ở xa muốn học qua Zoom,Comment bài viết,2026-09-02,
`;

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "coordinator")) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response("﻿" + SAMPLE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mau_khach_hang_tiem_nang.csv"',
    },
  });
}
