import path from "path";
import fs from "fs";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { BACKUP_DIR, backupFileName, writeSnapshot } from "@/lib/backup";
import { DATA_DIR } from "@/lib/db";

/**
 * Downloads a backup of the whole database as one .db file. Without `?file=`
 * it takes a fresh snapshot of the live data; with it, it serves one of the
 * daily snapshots already on the server.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const requested = new URL(req.url).searchParams.get("file");
  let filePath: string;
  let cleanUp = false;

  if (requested) {
    // Only ever serve a plain file name from inside BACKUP_DIR — never a path
    // the caller composed, so "..\.." can't reach the rest of the disk.
    if (!/^[\w.-]+\.db$/.test(requested)) {
      return new Response("Tên file không hợp lệ", { status: 400 });
    }
    filePath = path.join(BACKUP_DIR, requested);
    if (!fs.existsSync(/* turbopackIgnore: true */ filePath)) {
      return new Response("Không tìm thấy file sao lưu", { status: 404 });
    }
  } else {
    filePath = path.join(DATA_DIR, `tmp-${Date.now()}-${backupFileName()}`);
    writeSnapshot(filePath);
    cleanUp = true;
  }

  const body = fs.readFileSync(/* turbopackIgnore: true */ filePath);
  if (cleanUp) fs.rmSync(/* turbopackIgnore: true */ filePath, { force: true });

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(body.length),
      "Content-Disposition": `attachment; filename="${requested || backupFileName()}"`,
    },
  });
}
