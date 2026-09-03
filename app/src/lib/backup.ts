import path from "path";
import fs from "fs";
import { db, DATA_DIR } from "./db";

/** Where daily snapshots live — inside DATA_DIR so one folder holds everything worth backing up. */
export const BACKUP_DIR = path.join(DATA_DIR, "backups");

/** Daily snapshots kept on the server; older ones are pruned automatically. */
export const KEEP_BACKUPS = 30;

export interface BackupFile {
  name: string;
  bytes: number;
  createdAt: Date;
}

/**
 * Writes a consistent snapshot of the live database to `target` using SQLite's
 * own VACUUM INTO — safe to run while the app is serving requests (unlike
 * copying the file, which can catch a half-written page or miss the WAL).
 */
export function writeSnapshot(target: string) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.rmSync(target, { force: true });
  db.prepare("VACUUM INTO ?").run(target);
}

export function backupFileName(date = new Date()): string {
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
  return `musicnote-${stamp}.db`;
}

export function listBackups(): BackupFile[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((n) => n.endsWith(".db"))
    .map((name) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, bytes: stat.size, createdAt: stat.mtime };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Deletes the oldest snapshots beyond KEEP_BACKUPS so the disk can't fill up. */
export function pruneBackups(keep = KEEP_BACKUPS) {
  for (const file of listBackups().slice(keep)) {
    fs.rmSync(path.join(BACKUP_DIR, file.name), { force: true });
  }
}

/**
 * Takes today's snapshot (overwriting it if today's already exists, so running
 * twice in a day is harmless) and prunes old ones. Returns the file written.
 */
export function runBackup(): BackupFile {
  const name = backupFileName();
  const target = path.join(BACKUP_DIR, name);
  writeSnapshot(target);
  pruneBackups();
  const stat = fs.statSync(target);
  return { name, bytes: stat.size, createdAt: stat.mtime };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
