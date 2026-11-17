import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { formatVND, normalizeFacebookUrl, todayISO } from "./format";
import { cleanEmail } from "./mail";
import { getCenterContact, getSetting } from "./queries";
import { notifyNewCustomer } from "./telegram";
import { DAY_LABELS, PRICING, SUBJECT_SUGGESTIONS, canonicalCountry, phoneWithDialCode } from "./types";
import { now } from "./format";

/**
 * AI tư vấn trên trang chủ: trả lời khách về môn học, học phí, cách học, rồi
 * hỏi lịch rảnh và ghi thành một đăng ký học thử. Xếp giáo viên vẫn do trung
 * tâm làm — AI không hứa giáo viên hay giờ chính xác.
 *
 * Lịch sử hội thoại do trình duyệt giữ và gửi lên dạng chữ thuần (không có
 * khối thinking / tool), nên khách không giả được lệnh gọi công cụ và yêu cầu
 * nào cũng "sạch" với API.
 */

export const AI_KNOWLEDGE_KEY = "ai_chat_knowledge";
const MODEL = process.env.AI_CHAT_MODEL || "claude-opus-5-5";

export function aiChatEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY || process.env.AI_CHAT_MOCK === "1";
}

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface ChatReply {
  text: string;
  /** AI vừa ghi xong đăng ký học thử ở lượt này. */
  booked?: boolean;
}

// ---------------------------------------------------------------------------
// Kiến thức đưa cho AI
// ---------------------------------------------------------------------------

function pricingText(): string {
  return PRICING.map(({ subject, tiers }) => {
    const rows = tiers.map((t) => {
      const price = t.price ? formatVND(t.price) : "liên hệ";
      const usd = t.priceUSD ? ` (≈ ${t.priceUSD} USD cho khách trả USD)` : "";
      return `  - ${t.name} ${t.sessions} buổi: ${price}${usd}. ${t.features.join("; ")}`;
    });
    return `• ${subject}:\n${rows.join("\n")}`;
  }).join("\n");
}

function systemPrompt(): string {
  const contact = getCenterContact();
  const extra = (getSetting(AI_KNOWLEDGE_KEY) || "").trim();
  const d = now();
  const today = `${DAY_LABELS[d.getDay()]}, ${todayISO()}`;
  return `Bạn là trợ lý tư vấn của trung tâm "Piano Guitar Đệm Hát" — trung tâm dạy 1 kèm 1 online. Bạn nói chuyện với khách vừa vào trang web.

NHIỆM VỤ
1. Tư vấn: trả lời câu hỏi về môn học, cách học, học phí, giáo viên, lịch học. Thân thiện, ngắn gọn (2–5 câu mỗi lượt), dễ hiểu với phụ huynh. Hỏi học phí thì nêu tên gói, số buổi và giá; chỉ kể nội dung từng gói khi khách hỏi thêm.
2. Đặt lịch học thử: khi khách muốn học thử (hoặc sau khi tư vấn xong thì mời học thử miễn phí), hỏi dần — mỗi lượt 1–2 câu — đủ các thông tin:
   • Tên học viên (và tên phụ huynh nếu học viên là trẻ em), tuổi hoặc trình độ hiện tại
   • Môn muốn học
   • Đang ở nước nào (để tính múi giờ) và số điện thoại / Zalo / WhatsApp
   • Link Facebook của khách (để trung tâm thêm vào nhóm lớp) và Gmail / email (để gửi lịch và link vào học). Hướng dẫn lấy link Facebook nếu khách không biết: mở trang cá nhân → bấm "..." → "Sao chép liên kết". Chỉ bỏ trống mục nào khi khách nói không có hoặc không muốn cho.
   • Các khung giờ rảnh trong tuần (theo giờ nơi khách ở; nếu khách ở nước ngoài, quy đổi sang giờ Việt Nam và hỏi lại cho chắc)
   • Muốn giáo viên dạy bằng tiếng Việt hay tiếng Anh
   Đủ thông tin thì tóm tắt lại cho khách xác nhận, khách đồng ý thì gọi công cụ ghi_lich_hoc_thu. Ghi xong báo khách: trung tâm sẽ xếp giáo viên và liên hệ xác nhận giờ học thử sớm nhất.

QUY TẮC
- Trả lời bằng ngôn ngữ khách dùng (tiếng Việt hoặc tiếng Anh).
- Chỉ dùng thông tin bên dưới. Không bịa giá, khuyến mãi, tên giáo viên hay giờ trống cụ thể. Điều gì không chắc thì nói trung tâm sẽ báo lại, hoặc mời khách nhắn trung tâm.
- Không hứa giáo viên cụ thể hay chốt giờ chính xác, và không nói giờ nào giáo viên "dạy được" — bạn không xem được lịch giáo viên. Bạn chỉ ghi lịch rảnh của khách, trung tâm xếp giáo viên rồi gọi xác nhận.
- Câu nào khách bỏ qua 2 lần thì thôi, đừng hỏi lại (trừ SĐT và lịch rảnh) — ghi vào ghi chú để trung tâm hỏi sau.
- Bạn là trợ lý tự động của trung tâm. Không tự giới thiệu là AI, nhưng nếu khách hỏi bạn là người hay máy thì trả lời thật: bạn là trợ lý tự động, giáo vụ sẽ gọi lại xác nhận; không bao giờ nhận là người thật.
- Không xin thông tin nhạy cảm (mật khẩu, số thẻ, giấy tờ).
- Viết văn bản thuần, viết hoa đúng chính tả; không dùng bảng hay markdown (không **đậm**, không #); liệt kê thì dùng dấu "•".
- Câu hỏi ngoài lề (không liên quan việc học) thì từ chối khéo và quay lại tư vấn.

THÔNG TIN TRUNG TÂM
- Học 1 kèm 1 online qua Zoom / Google Meet, 60 phút mỗi buổi, lịch linh hoạt theo múi giờ của khách — học được từ bất kỳ nước nào.
- Học thử 1 buổi MIỄN PHÍ trước khi đăng ký gói.
- Giáo viên song ngữ Việt–Anh: học viên ở nước ngoài học bằng tiếng Anh được; ba mẹ trao đổi tiếng Việt, con học tiếng Anh cùng một giáo viên.
- Môn học: ${SUBJECT_SUGGESTIONS.join(", ")}.
  • Guitar: đệm hát, fingerstyle, solo — học từ con số 0. • Piano: đệm hát và cổ điển, cho người lớn lẫn các bé. • Violin: tư thế, kéo vĩ, những bản nhạc đầu tiên. • Saxophone: hơi, ngón bấm, bài quen thuộc. • Thanh nhạc: luyện hơi, luyện giọng, xử lý bài hát. • Toán: kèm bài trên lớp, lấy lại gốc, luyện đề. • Tiếng Việt: tập đọc, chính tả, tập làm văn bậc tiểu học (hợp cho con em Việt kiều). • Tiếng Anh: giao tiếp, ngữ pháp, luyện thi. • Quảng cáo: chạy quảng cáo Facebook. • Quay chụp dựng: quay chụp bằng điện thoại, dựng video ngắn.
- Học phí trọn gói (chưa có môn nào thì nói trung tâm sẽ báo giá):
${pricingText()}
${contact.zalo ? `- Zalo trung tâm: ${contact.zalo}\n` : ""}${contact.facebook ? `- Facebook trung tâm: ${contact.facebook}\n` : ""}${extra ? `\nTHÔNG TIN THÊM TỪ TRUNG TÂM (ưu tiên dùng nếu khác phần trên)\n${extra}\n` : ""}
Hôm nay (giờ Việt Nam): ${today}.`;
}

// ---------------------------------------------------------------------------
// Công cụ ghi lịch học thử
// ---------------------------------------------------------------------------

const nullableString = { type: ["string", "null"] } as const;

const BOOKING_TOOL: Anthropic.Beta.BetaTool = {
  name: "ghi_lich_hoc_thu",
  description:
    "Ghi đăng ký học thử của khách vào hệ thống để trung tâm xếp giáo viên. Chỉ gọi khi đã có đủ tên, số điện thoại, nước, môn và lịch rảnh, và khách đã xác nhận phần tóm tắt.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      ten_hoc_vien: { type: "string", description: "Tên học viên" },
      ten_phu_huynh: { ...nullableString, description: "Tên phụ huynh / người liên hệ nếu khác học viên" },
      tuoi_trinh_do: { ...nullableString, description: "Tuổi hoặc trình độ hiện tại" },
      so_dien_thoai: {
        type: "string",
        description: "CHỈ số điện thoại như khách cho (VD 0412 555 888 hoặc +61 412 555 888), không thêm chữ hay ghi chú",
      },
      facebook: { ...nullableString, description: "Link hoặc tên tài khoản Facebook của khách; null nếu khách không có / không cho" },
      email: { ...nullableString, description: "Gmail / email của khách; null nếu khách không có / không cho" },
      quoc_gia: { type: "string", description: "CHỈ tên nước, không ghi thành phố: Việt Nam, Úc, Mỹ, Canada, Singapore…" },
      mon_hoc: { type: "string", enum: SUBJECT_SUGGESTIONS },
      ngon_ngu: { type: "string", enum: ["vi", "en"], description: "Giáo viên dạy bằng tiếng Việt (vi) hay tiếng Anh (en)" },
      lich_ranh: {
        type: "string",
        description: "Các khung giờ khách rảnh, ghi rõ theo giờ nơi khách ở và quy đổi giờ Việt Nam, VD 'T3, T5 sau 19h giờ Sydney (= 16h VN)'",
      },
      ghi_chu: { ...nullableString, description: "Mong muốn / mục tiêu / điều trung tâm cần biết thêm" },
    },
    required: [
      "ten_hoc_vien",
      "ten_phu_huynh",
      "tuoi_trinh_do",
      "so_dien_thoai",
      "facebook",
      "email",
      "quoc_gia",
      "mon_hoc",
      "ngon_ngu",
      "lich_ranh",
      "ghi_chu",
    ],
    additionalProperties: false,
  },
};

interface BookingInput {
  ten_hoc_vien: string;
  ten_phu_huynh: string | null;
  tuoi_trinh_do: string | null;
  so_dien_thoai: string;
  facebook: string | null;
  email: string | null;
  quoc_gia: string;
  mon_hoc: string;
  ngon_ngu: "vi" | "en";
  lich_ranh: string;
  ghi_chu: string | null;
}

/** Ghi đăng ký học thử từ AI. Gọi lại trong cùng cuộc chat thì cập nhật đăng ký cũ, không tạo trùng. */
export function saveAiBooking(chatId: string, raw: unknown): { ok: boolean; message: string } {
  const b = raw as Partial<BookingInput>;
  const name = String(b.ten_hoc_vien ?? "").trim().slice(0, 100);
  // AI hay ghi thêm thành phố / chú thích trong ngoặc: bỏ đi rồi mới chuẩn hoá.
  const country = canonicalCountry(String(b.quoc_gia ?? "").replace(/\(.*?\)/g, "").split(/[,–-]/)[0]);
  const phoneRaw = String(b.so_dien_thoai ?? "").match(/\+?\d[\d\s().-]{6,}\d/)?.[0] ?? "";
  const phone = phoneWithDialCode(phoneRaw.slice(0, 30), country).slice(0, 30);
  const subject = SUBJECT_SUGGESTIONS.includes(String(b.mon_hoc)) ? String(b.mon_hoc) : null;
  const times = String(b.lich_ranh ?? "").trim().slice(0, 300);
  if (!name || !subject || !times || !/\d{6,}/.test(phone.replace(/\D/g, ""))) {
    return { ok: false, message: "Thiếu hoặc sai thông tin (tên, môn, số điện thoại, lịch rảnh) — hỏi lại khách rồi gọi lại." };
  }
  const note = [
    "🤖 Đặt qua AI tư vấn",
    `Lịch rảnh: ${times}`,
    b.tuoi_trinh_do ? `Tuổi/trình độ: ${b.tuoi_trinh_do}` : null,
    b.ghi_chu ? `Ghi chú: ${b.ghi_chu}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 500);
  const facebook = b.facebook ? normalizeFacebookUrl(String(b.facebook).slice(0, 300)) : null;
  const email = cleanEmail(b.email);
  const contact =
    [b.ten_phu_huynh ? `Phụ huynh: ${String(b.ten_phu_huynh).slice(0, 100)}` : null, facebook ? `FB: ${facebook}` : null]
      .filter(Boolean)
      .join(" · ") || null;
  const language = b.ngon_ngu === "en" ? "en" : "vi";

  const existing = db.prepare("SELECT trial_request_id AS id FROM ai_chats WHERE id = ?").get(chatId) as
    | { id: number | null }
    | undefined;
  if (existing?.id && db.prepare("SELECT 1 FROM trial_requests WHERE id = ?").get(existing.id)) {
    db.prepare(
      "UPDATE trial_requests SET name = ?, phone = ?, contact = ?, subject = ?, language = ?, note = ?, country = ?, email = ? WHERE id = ?"
    ).run(name, phone, contact, subject, language, note, country, email, existing.id);
    return { ok: true, message: "Đã cập nhật đăng ký học thử của khách." };
  }

  const requestId = Number(
    db
      .prepare(
        "INSERT INTO trial_requests (name, phone, contact, subject, language, note, country, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(name, phone, contact, subject, language, note, country, email).lastInsertRowid
  );
  db.prepare("UPDATE ai_chats SET trial_request_id = ? WHERE id = ?").run(requestId, chatId);
  notifyNewCustomer({ requestId, name, phone, subject, contact, note, country, email });
  return { ok: true, message: "Đã ghi đăng ký học thử. Trung tâm sẽ xếp giáo viên và liên hệ khách xác nhận giờ." };
}

// ---------------------------------------------------------------------------
// Lưu hội thoại + giới hạn
// ---------------------------------------------------------------------------

export const LIMITS = {
  /** Số lượt khách nhắn tối đa trong một cuộc chat. */
  turnsPerChat: 40,
  /** Độ dài một tin nhắn của khách. */
  messageChars: 1500,
  /** Mỗi địa chỉ IP: số tin trong 10 phút / trong ngày. */
  perIp10Min: 25,
  perIpDay: 150,
  /** Tổng số lượt gọi AI mỗi ngày của cả web — chặn hoá đơn tăng vọt. */
  perDay: Number(process.env.AI_CHAT_DAILY_CAP) || 1500,
};

const ipHits = new Map<string, number[]>();
let dayKey = "";
let dayCount = 0;

/** Trả về lý do chặn, hoặc null nếu cho qua. Đếm trong bộ nhớ — khởi động lại thì đếm lại, đủ dùng. */
export function rateLimit(ip: string): string | null {
  const t = Date.now();
  const today = todayISO();
  if (today !== dayKey) {
    dayKey = today;
    dayCount = 0;
    ipHits.clear();
  }
  if (dayCount >= LIMITS.perDay) return "busy";
  const hits = (ipHits.get(ip) ?? []).filter((x) => t - x < 24 * 3600_000);
  if (hits.length >= LIMITS.perIpDay || hits.filter((x) => t - x < 600_000).length >= LIMITS.perIp10Min) {
    return "slow";
  }
  hits.push(t);
  ipHits.set(ip, hits);
  dayCount++;
  return null;
}

export function saveTranscript(chatId: string, turns: ChatTurn[], ip: string) {
  const userTurns = turns.filter((t) => t.role === "user").length;
  db.prepare(
    `INSERT INTO ai_chats (id, transcript, user_turns, ip) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET transcript = excluded.transcript, user_turns = excluded.user_turns,
       updated_at = datetime('now')`
  ).run(chatId, JSON.stringify(turns), userTurns, ip);
}

export function getChatTranscript(id: string): { turns: ChatTurn[]; createdAt: string; trialRequestId: number | null } | null {
  const row = db.prepare("SELECT transcript, created_at, trial_request_id FROM ai_chats WHERE id = ?").get(id) as
    | { transcript: string; created_at: string; trial_request_id: number | null }
    | undefined;
  if (!row) return null;
  return { turns: JSON.parse(row.transcript) as ChatTurn[], createdAt: row.created_at, trialRequestId: row.trial_request_id };
}

export interface ChatSummary {
  id: string;
  userTurns: number;
  firstMessage: string;
  createdAt: string;
  updatedAt: string;
  trialRequestId: number | null;
  bookedName: string | null;
}

/** Các cuộc chat gần nhất, mới nhất lên đầu — cả khách chưa để lại lịch (khách tiềm năng). */
export function listRecentChats(limit = 200): ChatSummary[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.user_turns, c.transcript, c.created_at, c.updated_at, c.trial_request_id, t.name AS booked_name
         FROM ai_chats c LEFT JOIN trial_requests t ON t.id = c.trial_request_id
        ORDER BY c.updated_at DESC LIMIT ?`
    )
    .all(limit) as {
    id: string;
    user_turns: number;
    transcript: string;
    created_at: string;
    updated_at: string;
    trial_request_id: number | null;
    booked_name: string | null;
  }[];
  return rows.map((r) => {
    let first = "";
    try {
      first = (JSON.parse(r.transcript) as ChatTurn[]).find((t) => t.role === "user")?.text ?? "";
    } catch {}
    return {
      id: r.id,
      userTurns: r.user_turns,
      firstMessage: first.slice(0, 120),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      trialRequestId: r.trial_request_id,
      bookedName: r.booked_name,
    };
  });
}

/** Đăng ký học thử nào đến từ AI chat, để danh sách đăng ký có nút "Xem đoạn chat". */
export function chatIdsByTrialRequest(): Map<number, string> {
  const rows = db.prepare("SELECT id, trial_request_id FROM ai_chats WHERE trial_request_id IS NOT NULL").all() as {
    id: string;
    trial_request_id: number;
  }[];
  return new Map(rows.map((r) => [r.trial_request_id, r.id]));
}

// ---------------------------------------------------------------------------
// Gọi Claude
// ---------------------------------------------------------------------------

let client: Anthropic | null = null;

const FALLBACK_TEXT =
  "Xin lỗi, mình chưa trả lời được câu này. Bạn để lại số điện thoại hoặc nhắn Zalo / Facebook trung tâm, giáo vụ sẽ hỗ trợ ngay nhé.";

/**
 * Một lượt trả lời: gửi cả hội thoại (chữ thuần) cho Claude, chạy công cụ ghi
 * lịch nếu AI gọi, rồi trả về câu trả lời cuối cho khách.
 */
export async function replyToCustomer(chatId: string, turns: ChatTurn[]): Promise<ChatReply> {
  if (process.env.AI_CHAT_MOCK === "1" && !process.env.ANTHROPIC_API_KEY) {
    const { mockReply } = await import("./ai-chat-mock");
    return mockReply(chatId, turns);
  }
  client ??= new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = turns.map((t) => ({ role: t.role, content: t.text }));
  const system = systemPrompt();
  let booked = false;

  for (let step = 0; step < 4; step++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system,
      tools: [BOOKING_TOOL],
      messages,
      // Chat tư vấn không cần suy nghĩ sâu: effort thấp cho nhanh và rẻ.
      output_config: { effort: "low" },
      // Tự cache phần system prompt + hội thoại cũ giữa các lượt.
      cache_control: { type: "ephemeral" },
      // Bị bộ lọc an toàn từ chối thì API tự chạy lại trên model dự phòng.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      metadata: { user_id: chatId },
    });

    if (response.stop_reason === "refusal") return { text: FALLBACK_TEXT, booked };

    const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { text: text || FALLBACK_TEXT, booked };
    }

    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = toolUses.map((tu) => {
      if (tu.name !== BOOKING_TOOL.name) {
        return { type: "tool_result", tool_use_id: tu.id, content: "Công cụ không tồn tại.", is_error: true };
      }
      const r = saveAiBooking(chatId, tu.input);
      if (r.ok) booked = true;
      return { type: "tool_result", tool_use_id: tu.id, content: r.message, is_error: !r.ok };
    });
    messages.push({ role: "user", content: results });
  }
  return { text: booked ? "Mình đã ghi lịch học thử cho bạn rồi nhé! Trung tâm sẽ liên hệ xác nhận sớm." : FALLBACK_TEXT, booked };
}
