#!/usr/bin/env node
/**
 * Nightly database backup, meant to be run from cron:
 *
 *   0 2 * * * cd /root/musicnote/app && /usr/bin/node scripts/backup.mjs >> /var/log/musicnote-backup.log 2>&1
 *
 * Writes a dated snapshot into DATA_DIR/backups and keeps the newest KEEP.
 * Uses SQLite's VACUUM INTO, so it is safe to run while the app is serving.
 */
import path from "path";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const KEEP = Number(process.env.KEEP_BACKUPS || 30);

const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
  now.getDate()
).padStart(2, "0")}`;
const target = path.join(BACKUP_DIR, `musicnote-${stamp}.db`);

fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.rmSync(target, { force: true });

const db = new Database(path.join(DATA_DIR, "musicnote.db"), { readonly: true });
db.prepare("VACUUM INTO ?").run(target);
db.close();

const kept = fs
  .readdirSync(BACKUP_DIR)
  .filter((n) => n.endsWith(".db"))
  .sort()
  .reverse();
for (const old of kept.slice(KEEP)) {
  fs.rmSync(path.join(BACKUP_DIR, old), { force: true });
}

console.log(
  `[${now.toISOString()}] backup ok: ${target} (${fs.statSync(target).size} bytes), giữ ${Math.min(
    kept.length,
    KEEP
  )} bản`
);
