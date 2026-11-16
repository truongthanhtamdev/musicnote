import { saveAiBooking, type ChatReply, type ChatTurn } from "./ai-chat";

/**
 * Bản giả lập AI tư vấn để xem thử giao diện khi máy chưa có ANTHROPIC_API_KEY
 * (bật bằng AI_CHAT_MOCK=1). Không gọi mạng: trả lời theo kịch bản cố định, và
 * khi khách gửi số điện thoại thì ghi một đăng ký học thử thật vào cơ sở dữ liệu.
 */
export function mockReply(chatId: string, turns: ChatTurn[]): ChatReply {
  const last = turns[turns.length - 1]?.text ?? "";
  const userCount = turns.filter((t) => t.role === "user").length;
  if (/\d{8,}/.test(last.replace(/[\s.()+-]/g, ""))) {
    const r = saveAiBooking(chatId, {
      ten_hoc_vien: "Bé Na",
      ten_phu_huynh: "Chị Lan",
      tuoi_trinh_do: "8 tuổi, chưa biết đàn",
      so_dien_thoai: last.match(/[+\d][\d\s().-]{7,}/)?.[0] ?? last,
      quoc_gia: "Úc",
      mon_hoc: "Piano",
      ngon_ngu: "vi",
      lich_ranh: "T3, T5 sau 18h giờ Sydney (= 14h–15h VN)",
      ghi_chu: null,
    });
    return {
      booked: r.ok,
      text:
        "Mình đã ghi lịch học thử Piano cho bé Na rồi ạ 🎹\n• Lịch rảnh: T3, T5 sau 18h giờ Sydney (khoảng 14h–15h giờ Việt Nam)\n• Liên hệ: chị Lan\nTrung tâm sẽ xếp giáo viên và gọi chị xác nhận giờ học thử trong hôm nay nhé!",
    };
  }
  if (userCount <= 1) {
    return {
      text:
        "Dạ chào chị! Trung tâm dạy Piano 1 kèm 1 online qua Zoom/Meet, mỗi buổi 60 phút, lịch linh hoạt theo múi giờ nên bé ở Úc học thoải mái ạ.\n• Gói 20 buổi: 8.000.000đ\n• Gói 50 buổi: 16.000.000đ\nBé được học thử 1 buổi miễn phí trước. Chị cho mình xin tên và tuổi của bé nhé?",
    };
  }
  return {
    text: "Dạ vâng ạ. Chị thường rảnh những ngày nào, khung giờ mấy giờ (giờ Sydney)? Và chị cho mình xin số điện thoại / Zalo để trung tâm liên hệ xác nhận nhé.",
  };
}
