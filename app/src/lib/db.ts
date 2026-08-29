import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(/* turbopackIgnore: true */ DATA_DIR)) {
  fs.mkdirSync(/* turbopackIgnore: true */ DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, "musicnote.db");

declare global {
  var __musicnoteDb: Database.Database | undefined;
}

function createConnection() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  // Several build/dev worker processes can import this module concurrently
  // against the same file; let a writer wait for a lock instead of throwing
  // SQLITE_BUSY immediately (seed() below also takes an exclusive lock).
  db.pragma("busy_timeout = 5000");
  return db;
}

export const db = global.__musicnoteDb ?? createConnection();
if (process.env.NODE_ENV !== "production") global.__musicnoteDb = db;

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','coordinator','teacher')),
      phone TEXT,
      pay_per_session INTEGER,
      languages TEXT NOT NULL DEFAULT 'vi',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_name TEXT NOT NULL,
      student_phone TEXT,
      level TEXT,
      subject TEXT NOT NULL DEFAULT 'Guitar',
      language TEXT NOT NULL DEFAULT 'vi' CHECK(language IN ('vi','en')),
      source TEXT NOT NULL DEFAULT 'center' CHECK(source IN ('center','self')),
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','ended')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      UNIQUE(teacher_id, day_of_week, start_time)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      teacher_id INTEGER NOT NULL REFERENCES users(id),
      session_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('completed','teacher_absent','student_absent','rescheduled')),
      check_in_time TEXT,
      check_out_time TEXT,
      fb_checkin_confirmed INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(class_id, session_date)
    );

    CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_teacher_date ON attendance(teacher_id, session_date);
    CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, session_date);
    CREATE INDEX IF NOT EXISTS idx_availability_teacher ON availability(teacher_id);
  `);

  // CREATE TABLE IF NOT EXISTS above only helps on a brand-new database file;
  // a database created before these columns existed needs them added
  // explicitly, or older deployments crash on the first query that touches
  // one of them.
  ensureColumn("classes", "subject", "TEXT NOT NULL DEFAULT 'Guitar'");
  ensureColumn("classes", "language", "TEXT NOT NULL DEFAULT 'vi'");
  ensureColumn("classes", "source", "TEXT NOT NULL DEFAULT 'center'");
  ensureColumn("users", "languages", "TEXT NOT NULL DEFAULT 'vi'");
}

function ensureColumn(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function seedInner() {
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (userCount.c > 0) return;

  const insertUser = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, phone, pay_per_session, active)
     VALUES (@name, @email, @password_hash, @role, @phone, @pay_per_session, 1)`
  );

  const admin = insertUser.run({
    name: "Quản trị viên",
    email: "admin@musicnote.local",
    password_hash: bcrypt.hashSync("admin123", 10),
    role: "admin",
    phone: null,
    pay_per_session: null,
  });

  insertUser.run({
    name: "Quản lý ca",
    email: "manager@musicnote.local",
    password_hash: bcrypt.hashSync("manager123", 10),
    role: "coordinator",
    phone: null,
    pay_per_session: null,
  });

  const insertTeacher = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, phone, pay_per_session, languages, active)
     VALUES (@name, @email, @password_hash, 'teacher', @phone, @pay_per_session, @languages, 1)`
  );

  const t1 = insertTeacher.run({
    name: "Nguyễn Văn Long",
    email: "long.guitar@musicnote.local",
    password_hash: bcrypt.hashSync("teacher123", 10),
    phone: "0901234567",
    pay_per_session: 125000,
    languages: "vi",
  });

  const t2 = insertTeacher.run({
    name: "Trần Thị Mai",
    email: "mai.guitar@musicnote.local",
    password_hash: bcrypt.hashSync("teacher123", 10),
    phone: "0907654321",
    pay_per_session: 150000,
    languages: "vi,en",
  });

  const insertAvail = db.prepare(
    `INSERT INTO availability (teacher_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)`
  );
  for (const d of [1, 2, 3, 4, 5]) {
    insertAvail.run(t1.lastInsertRowid, d, "18:00", "21:00");
  }
  for (const d of [0, 6]) {
    insertAvail.run(t1.lastInsertRowid, d, "09:00", "12:00");
  }
  for (const d of [2, 4, 6]) {
    insertAvail.run(t2.lastInsertRowid, d, "19:00", "22:00");
  }

  const insertClass = db.prepare(
    `INSERT INTO classes (student_name, student_phone, level, subject, language, source, day_of_week, start_time, duration_minutes, teacher_id, status, notes)
     VALUES (@student_name, @student_phone, @level, @subject, @language, @source, @day_of_week, @start_time, @duration_minutes, @teacher_id, 'active', @notes)`
  );
  insertClass.run({
    student_name: "Bé Minh Khang",
    student_phone: "0912000111",
    level: "Cơ bản",
    subject: "Guitar",
    language: "vi",
    source: "center",
    day_of_week: 2,
    start_time: "19:00",
    duration_minutes: 60,
    teacher_id: t1.lastInsertRowid,
    notes: "Học guitar đệm hát",
  });
  insertClass.run({
    student_name: "Chị Thu Hà",
    student_phone: "0912000222",
    level: "Trung cấp",
    subject: "Piano",
    language: "vi",
    source: "center",
    day_of_week: 4,
    start_time: "20:00",
    duration_minutes: 60,
    teacher_id: t2.lastInsertRowid,
    notes: "",
  });
  insertClass.run({
    student_name: "Anh Quốc Bảo",
    student_phone: "0912000333",
    level: "Cơ bản",
    subject: "Guitar",
    language: "vi",
    source: "center",
    day_of_week: 6,
    start_time: "10:00",
    duration_minutes: 60,
    teacher_id: null,
    notes: "Lớp mới, chưa xếp giáo viên",
  });
  insertClass.run({
    student_name: "Ms. Sarah Johnson",
    student_phone: "0912000444",
    level: "Cơ bản",
    subject: "Guitar",
    language: "en",
    source: "center",
    day_of_week: 3,
    start_time: "18:00",
    duration_minutes: 60,
    teacher_id: t2.lastInsertRowid,
    notes: "Học viên nước ngoài, dạy bằng tiếng Anh",
  });

  void admin;
}

function seed() {
  // Exclusive transaction: several worker processes may import this module
  // concurrently against the same on-disk file (e.g. during `next build`).
  // The exclusive lock serializes them so only one actually inserts the
  // seed rows; the others block, then see userCount > 0 and no-op.
  try {
    db.transaction(seedInner).exclusive();
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "SQLITE_CONSTRAINT_UNIQUE" && code !== "SQLITE_BUSY") throw err;
  }
}

migrate();
seed();
