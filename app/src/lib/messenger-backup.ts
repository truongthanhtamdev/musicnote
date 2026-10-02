/**
 * Tin điểm danh dán vào nhóm Messenger của lớp (bản backup). Không đụng
 * database — dùng được cả ở máy chủ lẫn trình duyệt.
 */

export function buildBackupMessage(o: {
  studentName: string;
  sessionDate: string;
  status: string;
  statusLabel: string;
  sessionNumber: string;
  lessonContent: string;
  note: string;
  rescheduledDate: string;
  rescheduledTime: string;
}): string {
  const [y, m, d] = o.sessionDate.split("-");
  const date = `${d}/${m}/${y}`;
  if (o.status === "completed") {
    const buoi =
      o.sessionNumber === "0" ? "Buổi học thử" : o.sessionNumber ? `Buổi ${o.sessionNumber}` : "Buổi học";
    const lines = [`✅ ${o.studentName} – ${buoi} ${date}`];
    if (o.lessonContent) lines.push(o.lessonContent);
    if (o.note) lines.push(`Ghi chú: ${o.note}`);
    return lines.join("\n");
  }
  const lines = [`⚠️ ${o.studentName} – ${date}: ${o.statusLabel}`];
  if (o.rescheduledDate) {
    const [ry, rm, rd] = o.rescheduledDate.split("-");
    lines.push(`Học bù: ${rd}/${rm}/${ry}${o.rescheduledTime ? ` lúc ${o.rescheduledTime}` : ""}`);
  }
  if (o.note) lines.push(`Ghi chú: ${o.note}`);
  return lines.join("\n");
}
