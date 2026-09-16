import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "./db";
import { normalizeLoginPhone } from "./queries";

/**
 * Mật khẩu tạm dễ đọc qua điện thoại: bỏ các ký tự nhìn giống nhau (0/O,
 * 1/l/I) để giáo vụ đọc cho khách không bị nhầm.
 */
export function tempPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(8), (b) => alphabet[b % alphabet.length]).join("");
}

export interface NewStudentAccount {
  userId: number;
  login: string;
  password: string;
  classCount: number;
}

/**
 * Tạo một tài khoản đăng nhập cho khách và gắn sẵn các lớp của họ.
 *
 * Dùng chung cho hai lối vào: tạo hàng loạt ở trang Tài khoản học viên, và
 * tạo ngay lúc ghi nhận học phí. Ném lỗi nếu tên đăng nhập đã tồn tại —
 * bảng users có ràng buộc duy nhất, nơi gọi tự quyết định báo gì cho người
 * dùng.
 */
export function createStudentAccount(opts: {
  name: string;
  login: string;
  classIds: number[];
}): NewStudentAccount {
  const password = tempPassword();
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, phone, active)
       VALUES (?, ?, ?, 'student', ?, 1)`
    )
    .run(opts.name, opts.login, bcrypt.hashSync(password, 10), opts.login);

  const userId = Number(info.lastInsertRowid);
  const link = db.prepare("UPDATE classes SET student_user_id = ? WHERE id = ?");
  for (const classId of opts.classIds) link.run(userId, classId);

  return { userId, login: opts.login, password, classCount: opts.classIds.length };
}

export interface ClassAccountTarget {
  /** Tên hiển thị của tài khoản: người đóng học phí, không thì chính học viên. */
  name: string;
  login: string;
  /** Lớp của cùng khách này chưa gắn tài khoản nào — gắn hết vào tài khoản mới. */
  classIds: number[];
  /** Tài khoản học viên đã dùng số này rồi, nếu có. */
  existing?: { id: number; name: string };
}

/**
 * Từ một lớp, dựng thông tin để tạo tài khoản cho khách của lớp đó.
 *
 * Gom theo số điện thoại: mẹ đóng tiền cho hai con thì cả hai lớp vào chung
 * một tài khoản, khách chỉ phải nhớ một mật khẩu. Trả null khi lớp chưa có
 * số điện thoại hợp lệ — không có tên đăng nhập thì không tạo được.
 */
export function accountTargetForClass(classId: number): ClassAccountTarget | null {
  const cls = db
    .prepare(
      "SELECT id, student_name, guardian_name, student_phone, student_user_id FROM classes WHERE id = ?"
    )
    .get(classId) as
    | {
        id: number;
        student_name: string;
        guardian_name: string | null;
        student_phone: string | null;
        student_user_id: number | null;
      }
    | undefined;
  if (!cls || cls.student_user_id) return null;

  const login = normalizeLoginPhone(cls.student_phone ?? "");
  if (!login) return null;

  const existing = db
    .prepare("SELECT id, name FROM users WHERE email = ? COLLATE NOCASE AND role = 'student'")
    .get(login) as { id: number; name: string } | undefined;

  const siblings = db
    .prepare(
      `SELECT id, student_phone FROM classes
        WHERE student_user_id IS NULL AND student_phone IS NOT NULL`
    )
    .all() as { id: number; student_phone: string }[];

  return {
    name: (cls.guardian_name || cls.student_name).trim(),
    login,
    classIds: siblings
      .filter((s) => normalizeLoginPhone(s.student_phone) === login)
      .map((s) => s.id),
    existing,
  };
}
