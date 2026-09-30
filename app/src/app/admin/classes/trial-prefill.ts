import { getTrialRequest } from "@/lib/queries";
import type { ClassPrefill } from "./new-class-form";
import { wheelPrizeNote } from "@/lib/types";

/**
 * Điền sẵn form tạo lớp từ một đăng ký học thử. Dùng chung cho trang Lớp học
 * (Quản lý) và trang Tạo lớp (nhân viên đặt hẹn) để hai nơi không lệch nhau.
 */
export function trialPrefill(trialId: string | undefined): ClassPrefill | undefined {
  const req = trialId ? getTrialRequest(Number(trialId)) : undefined;
  if (!req) return undefined;
  return {
    trialRequestId: req.id,
    studentName: req.name,
    phone: req.phone,
    subject: req.subject,
    language: req.language,
    // Ghi chú của khách và kênh liên hệ đi theo lớp luôn — giáo viên nhận lớp
    // biết khách ở múi giờ nào, đã học tới đâu.
    note: [
      wheelPrizeNote(req),
      req.note,
      req.contact,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}
