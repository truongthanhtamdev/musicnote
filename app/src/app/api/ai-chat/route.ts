import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { LIMITS, aiChatEnabled, rateLimit, replyToCustomer, saveTranscript, type ChatTurn } from "@/lib/ai-chat";

/**
 * Khung chat AI tư vấn trên trang chủ. Ai vào web cũng gọi được, nên: kiểm tra
 * kỹ dữ liệu gửi lên, giới hạn theo IP và theo ngày để không ai đốt tiền API.
 */
export async function POST(req: NextRequest) {
  if (!aiChatEnabled()) return NextResponse.json({ error: "off" }, { status: 503 });

  let body: { chatId?: unknown; turns?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }
  const chatId = typeof body.chatId === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(body.chatId) ? body.chatId : null;
  const raw = Array.isArray(body.turns) ? body.turns : null;
  if (!chatId || !raw || raw.length === 0 || raw.length > LIMITS.turnsPerChat * 2) {
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }
  // Chỉ nhận chữ thuần, xen kẽ khách / AI, bắt đầu và kết thúc bằng lượt của khách.
  const turns: ChatTurn[] = [];
  for (const t of raw as { role?: unknown; text?: unknown }[]) {
    const role = t?.role === "assistant" ? "assistant" : t?.role === "user" ? "user" : null;
    const text = typeof t?.text === "string" ? t.text.trim().slice(0, role === "user" ? LIMITS.messageChars : 4000) : "";
    if (!role || !text) return NextResponse.json({ error: "bad" }, { status: 400 });
    if (turns.length === 0 && role === "assistant") continue; // câu chào sẵn của khung chat
    if (turns.length && turns[turns.length - 1].role === role) {
      turns[turns.length - 1].text += `\n${text}`;
      continue;
    }
    turns.push({ role, text });
  }
  if (turns.length === 0 || turns[turns.length - 1].role !== "user") {
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }
  if (turns.filter((t) => t.role === "user").length > LIMITS.turnsPerChat) {
    return NextResponse.json({ error: "long" }, { status: 429 });
  }

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "?";
  const limited = rateLimit(ip);
  if (limited) return NextResponse.json({ error: limited }, { status: 429 });

  saveTranscript(chatId, turns, ip);
  try {
    const reply = await replyToCustomer(chatId, turns);
    saveTranscript(chatId, [...turns, { role: "assistant", text: reply.text }], ip);
    return NextResponse.json(reply);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError || (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500)) {
      console.error("[ai-chat] API bận:", e.message);
      return NextResponse.json({ error: "busy" }, { status: 503 });
    }
    console.error("[ai-chat] lỗi:", e);
    return NextResponse.json({ error: "fail" }, { status: 500 });
  }
}

