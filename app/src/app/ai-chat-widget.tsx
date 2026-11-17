"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";

type Turn = { role: "user" | "assistant"; text: string };

const STORE_KEY = "pgdh-ai-chat";
const GREETING: Turn = {
  role: "assistant",
  text:
    "Chào bạn 👋 Mình là trợ lý tư vấn của Piano Guitar Đệm Hát. Bạn muốn tìm hiểu môn nào, hay đặt lịch học thử miễn phí? Hỏi mình về học phí, cách học online, giáo viên… đều được nhé!",
};
const SUGGESTIONS = ["Học phí bao nhiêu?", "Học online như thế nào?", "Đặt lịch học thử miễn phí"];

const ERRORS: Record<string, string> = {
  slow: "Bạn nhắn hơi nhanh, đợi một chút rồi gửi lại giúp mình nhé.",
  long: "Cuộc trò chuyện đã dài — bạn bấm “Cuộc chat mới”, hoặc nhắn Zalo / Facebook trung tâm nhé.",
  busy: "Trợ lý đang bận, bạn thử lại sau ít phút hoặc nhắn Zalo / Facebook trung tâm nhé.",
};

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Khung chat AI tư vấn ở góc trang chủ. Hội thoại lưu trong trình duyệt (khách
 * đóng trang mở lại vẫn còn); máy chủ cũng lưu một bản để giáo vụ đọc lại.
 */
export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string>("");
  const [turns, setTurns] = useState<Turn[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let saved: { chatId?: string; turns?: Turn[] } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    } catch {}
    // Đọc hội thoại cũ từ trình duyệt sau khi trang đã hiện (localStorage không có lúc render ở máy chủ).
    /* eslint-disable react-hooks/set-state-in-effect */
    setChatId(saved?.chatId || newId());
    if (saved?.turns?.length) setTurns(saved.turns);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!chatId) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ chatId, turns: turns.slice(-80) }));
    } catch {}
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [chatId, turns, open]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || sending) return;
    setError(null);
    const next = [...turns, { role: "user" as const, text: msg }];
    setTurns(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId, turns: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setError(ERRORS[data.error ?? ""] ?? "Mạng chập chờn — bạn gửi lại giúp mình nhé.");
        setTurns(turns);
        setInput(msg);
        return;
      }
      setTurns([...next, { role: "assistant", text: data.text }]);
    } catch {
      setError("Mạng chập chờn — bạn gửi lại giúp mình nhé.");
      setTurns(turns);
      setInput(msg);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setChatId(newId());
    setTurns([GREETING]);
    setError(null);
  }

  return (
    <>
      {!open && (
        // Góc trái: góc phải đã có nút Messenger / Zalo của trung tâm. Avatar to,
        // có vòng sáng nhấp nháy và lời chào để khách để ý mà bấm vào.
        <div className="fixed bottom-4 left-4 z-40 flex items-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Chat với trợ lý tư vấn"
            className="relative shrink-0 rounded-full"
          >
            <span className="absolute inset-0 rounded-full bg-coral-500/60 animate-ping" aria-hidden />
            <span className="relative flex h-16 w-16 sm:h-[72px] sm:w-[72px] items-center justify-center rounded-full border-4 border-white bg-navy-950 shadow-xl">
              <Logo className="h-9 sm:h-10" />
            </span>
            <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-white bg-mint-500" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            // Chừa chỗ cho nút Messenger / Facebook ở góc phải trên điện thoại.
            className="mb-2 max-w-[calc(100vw-10.5rem)] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-left shadow-lg ring-1 ring-navy-100"
          >
            <span className="block text-sm font-bold text-ink-900">Tư vấn &amp; đặt lịch học thử</span>
            <span className="block text-xs text-ink-500">Trả lời ngay 💬</span>
          </button>
        </div>
      )}
      {open && (
        <div
          role="dialog"
          aria-label="Trợ lý tư vấn"
          className="fixed z-50 inset-x-0 bottom-0 h-[85dvh] sm:inset-x-auto sm:bottom-4 sm:left-4 sm:h-[600px] sm:max-h-[calc(100dvh-2rem)] sm:w-[380px] flex flex-col rounded-t-2xl sm:rounded-2xl border border-navy-100 bg-white shadow-2xl"
        >
          <div className="flex items-center gap-3 rounded-t-2xl bg-navy-950 px-4 py-3 text-white">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-navy-900">
              <Logo className="h-7" />
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-navy-950 bg-mint-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">Trợ lý tư vấn</p>
              <p className="text-xs text-navy-200">Trả lời ngay · đặt lịch học thử miễn phí</p>
            </div>
            <button type="button" onClick={reset} className="text-xs text-navy-200 hover:text-white underline">
              Cuộc chat mới
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="ml-1 rounded-lg px-2 py-1 text-lg leading-none hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 bg-ivory-50 px-3 py-4">
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    t.role === "user"
                      ? "rounded-br-md bg-wood-500 text-white"
                      : "rounded-bl-md border border-navy-100 bg-white text-ink-800"
                  }`}
                >
                  {t.text}
                </p>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <p className="rounded-2xl rounded-bl-md border border-navy-100 bg-white px-3.5 py-2.5 text-sm text-ink-400">
                  Đang trả lời…
                </p>
              </div>
            )}
            {turns.length === 1 && !sending && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-wood-300 bg-white px-3 py-1.5 text-xs font-semibold text-wood-700 hover:bg-wood-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="border-t border-coral-100 bg-coral-50 px-4 py-2 text-xs text-coral-700">{error}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 border-t border-navy-100 p-3"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              maxLength={1500}
              placeholder="Nhập câu hỏi của bạn…"
              aria-label="Tin nhắn"
              className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-navy-200 px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="shrink-0 rounded-xl bg-coral-600 hover:bg-coral-700 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Gửi
            </button>
          </form>
          <p className="px-4 pb-2 text-[11px] text-ink-400">Trợ lý AI có thể nhầm — giáo vụ sẽ gọi xác nhận lại lịch học.</p>
        </div>
      )}
    </>
  );
}
