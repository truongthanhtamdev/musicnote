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
  // Set busy_timeout FIRST: several worker processes can import this module
  // concurrently against the same file (e.g. during `next build`), and even
  // the journal_mode/foreign_keys pragmas below can need a brief write lock
  // (e.g. while another worker is mid-migration). Waiting for that lock
  // instead of failing immediately requires busy_timeout to already be set
  // before any other statement runs on this connection.
  db.pragma("busy_timeout = 5000");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
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
      role TEXT NOT NULL CHECK(role IN ('admin','coordinator','teacher','student')),
      phone TEXT,
      pay_per_session INTEGER,
      languages TEXT NOT NULL DEFAULT 'vi',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_sessions INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_name TEXT NOT NULL,
      student_phone TEXT,
      guardian_name TEXT,
      student_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      level TEXT,
      subject TEXT NOT NULL DEFAULT 'Guitar',
      language TEXT NOT NULL DEFAULT 'vi' CHECK(language IN ('vi','en')),
      source TEXT NOT NULL DEFAULT 'center' CHECK(source IN ('center','self')),
      package_total_sessions INTEGER,
      package_started_at TEXT,
      package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
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
      lesson_content TEXT,
      is_trial INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(class_id, session_date)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      amount INTEGER NOT NULL,
      paid_at TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'Quảng cáo (Ads)',
      amount INTEGER NOT NULL,
      expense_date TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      phone_normalized TEXT,
      fb_name TEXT,
      fb_url TEXT,
      area TEXT,
      subject TEXT NOT NULL DEFAULT 'Guitar',
      learning_mode TEXT NOT NULL DEFAULT 'home_private'
        CHECK(learning_mode IN ('home_private','online','cafe_group','center')),
      need TEXT,
      source TEXT NOT NULL DEFAULT 'Facebook Ads',
      received_at TEXT NOT NULL DEFAULT (date('now')),
      status TEXT NOT NULL DEFAULT 'new'
        CHECK(status IN ('new','contacted','consulting','trial_scheduled','trial_done','won','lost','cold')),
      temperature TEXT NOT NULL DEFAULT 'warm' CHECK(temperature IN ('hot','warm','cold')),
      owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      next_follow_up TEXT,
      expected_value INTEGER,
      lost_reason TEXT,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      won_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lead_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      kind TEXT NOT NULL DEFAULT 'note'
        CHECK(kind IN ('note','call','message','appointment','status')),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_classes_student_user ON classes(student_user_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_teacher_date ON attendance(teacher_id, session_date);
    CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, session_date);
    CREATE INDEX IF NOT EXISTS idx_availability_teacher ON availability(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(next_follow_up);
    CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone_normalized);
    CREATE INDEX IF NOT EXISTS idx_leads_class ON leads(class_id);
    CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id);
  `);

  // CREATE TABLE IF NOT EXISTS above only helps on a brand-new database file;
  // a database created before these columns existed needs them added
  // explicitly, or older deployments crash on the first query that touches
  // one of them.
  ensureColumn("classes", "guardian_name", "TEXT");
  ensureColumn("classes", "subject", "TEXT NOT NULL DEFAULT 'Guitar'");
  ensureColumn("classes", "language", "TEXT NOT NULL DEFAULT 'vi'");
  ensureColumn("classes", "source", "TEXT NOT NULL DEFAULT 'center'");
  ensureColumn("classes", "student_user_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL");
  ensureColumn("classes", "package_total_sessions", "INTEGER");
  ensureColumn("classes", "package_started_at", "TEXT");
  ensureColumn("classes", "package_id", "INTEGER REFERENCES packages(id) ON DELETE SET NULL");
  ensureColumn("users", "languages", "TEXT NOT NULL DEFAULT 'vi'");
  ensureColumn("attendance", "lesson_content", "TEXT");
  ensureColumn("attendance", "is_trial", "INTEGER NOT NULL DEFAULT 0");
  ensureStudentRoleSupported();
  migratePackagesToTable();
}

// Packages used to live as two columns directly on `classes`
// (package_total_sessions/package_started_at), one package per weekly slot.
// Now multiple weekly slots for the same student can share a single package
// pool via `classes.package_id` -> `packages`. Move any pre-existing
// per-class package data into its own `packages` row the first time this
// runs against an older database; the old columns are left in place
// unused (harmless) rather than dropped, since SQLite migrations that drop
// columns are riskier than they're worth here.
function migratePackagesToTable() {
  const rows = db
    .prepare(
      `SELECT id, package_total_sessions, package_started_at FROM classes
       WHERE package_total_sessions IS NOT NULL AND package_started_at IS NOT NULL AND package_id IS NULL`
    )
    .all() as { id: number; package_total_sessions: number; package_started_at: string }[];
  for (const r of rows) {
    const info = db
      .prepare("INSERT INTO packages (total_sessions, started_at) VALUES (?, ?)")
      .run(r.package_total_sessions, r.package_started_at);
    db.prepare("UPDATE classes SET package_id = ? WHERE id = ?").run(info.lastInsertRowid, r.id);
  }
}

function ensureColumn(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// SQLite can't ALTER a CHECK constraint in place. A database created before
// the 'student' role existed still has the old
// CHECK(role IN ('admin','coordinator','teacher')) baked into its schema, so
// inserting a student would fail — rebuild the table (preserving all rows)
// the one time that's detected.
function ensureStudentRoleSupported() {
  const rebuild = () => {
    const row = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
      .get() as { sql: string } | undefined;
    if (!row || row.sql.includes("'student'")) return;

    db.exec(`
      ALTER TABLE users RENAME TO users_role_migration;
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','coordinator','teacher','student')),
        phone TEXT,
        pay_per_session INTEGER,
        languages TEXT NOT NULL DEFAULT 'vi',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO users SELECT * FROM users_role_migration;
      DROP TABLE users_role_migration;
    `);
  };

  // Exclusive transaction: several worker processes may import this module
  // concurrently against the same on-disk file (e.g. during `next build`).
  // The lock serializes them so only one actually rebuilds the table; the
  // others block, then see the 'student' role already present and no-op.
  try {
    db.transaction(rebuild).exclusive();
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "SQLITE_BUSY") throw err;
  }
}

function seedInner() {
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (userCount.c > 0) return;

  db.prepare(
    `INSERT INTO users (name, email, password_hash, role, active)
     VALUES (@name, @email, @password_hash, 'admin', 1)`
  ).run({
    name: "Quản trị viên",
    email: "admin@musicnote.local",
    password_hash: bcrypt.hashSync("admin123", 10),
  });
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
