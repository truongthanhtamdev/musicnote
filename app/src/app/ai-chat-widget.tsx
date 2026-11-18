"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { IconChat } from "@/components/icons";
import { TrackedLink } from "@/components/tracked-link";

type Turn = { role: "user" | "assistant"; text: string };

const STORE_KEY = "pgdh-ai-chat";
const SEEN_KEY = "pgdh-ai-chat-seen";
/** Trong một lần vào web: "closed" = khách bấm ✕ hoặc đã mở chat (thôi chào); "hello" = đã chào. */
const TEASER_KEY = "pgdh-ai-teaser";
const PRICING_KEY = "pgdh-ai-teaser-pricing";

/** Lời chào tự hiện: chào lần đầu / khách cũ quay lại / đáp khi khách muốn tự xem / nhắc ở phần học phí. */
type Teaser = "hello" | "back" | "browse" | "pricing";

function session(key: string, value?: string): string | null {
  try {
    if (value !== undefined) sessionStorage.setItem(key, value);
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
const GREETING: Turn = {
  role: "assistant",
  text:
    "Chào anh/chị 👋 Em là trợ lý tư vấn của Piano Guitar Đệm Hát. Em có thể báo học phí, lịch học và đặt lịch học thử miễn phí cho anh/chị ngay. Hoặc anh/chị cứ xem website một vòng, cần gì em hỗ trợ liền nhé!",
};
const SUGGESTIONS = ["Học phí bao nhiêu?", "Học thử miễn phí", "Học online thế nào?"];

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
export function AiChatWidget({ messenger, zalo }: { messenger: string | null; zalo: string | null }) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  // Chấm đỏ "1" tắt hẳn sau lần đầu khách mở chat; nút nhún nhẹ sau vài giây cho khách để ý.
  const [seen, setSeen] = useState(true);
  const [nudge, setNudge] = useState(false);
  const [chatId, setChatId] = useState<string>("");
  const [turns, setTurns] = useState<Turn[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [teaser, setTeaser] = useState<Teaser | null>(null);
  // Đọc trong setTimeout / IntersectionObserver nên cần bản mới nhất, không lấy theo lúc tạo hàm.
  const busyRef = useRef(false);
  useEffect(() => {
    busyRef.current = open || menu;
  }, [open, menu]);

  useEffect(() => {
    let saved: { chatId?: string; turns?: Turn[] } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    } catch {}
    // Đọc hội thoại cũ từ trình duyệt sau khi trang đã hiện (localStorage không có lúc render ở máy chủ).
    /* eslint-disable react-hooks/set-state-in-effect */
    setChatId(saved?.chatId || newId());
    if (saved?.turns?.length) setTurns(saved.turns);
    try {
      setSeen(localStorage.getItem(SEEN_KEY) === "1");
    } catch {
      setSeen(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    const on = setTimeout(() => setNudge(true), 4000);
    const off = setTimeout(() => setNudge(false), 6500);

    // Vào trang khoảng 5 giây thì trợ lý chào (mỗi lần vào web chỉ một lần).
    const returning = !!saved?.turns?.some((t) => t.role === "user");
    const hello = setTimeout(() => {
      if (busyRef.current || session(TEASER_KEY)) return;
      session(TEASER_KEY, "hello");
      setTeaser(returning ? "back" : "hello");
    }, 5000);

    // Khách đã được chào, kéo tới bảng học phí (đang cân nhắc) thì hỏi lại đúng một lần.
    const pricing = document.getElementById("hoc-phi");
    const observer =
      pricing && "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              if (!entries.some((e) => e.isIntersecting)) return;
              if (busyRef.current || session(TEASER_KEY) !== "hello" || session(PRICING_KEY)) return;
              session(PRICING_KEY, "1");
              setTeaser("pricing");
            },
            { threshold: 0.3 }
          )
        : null;
    if (pricing) observer?.observe(pricing);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
      clearTimeout(hello);
      observer?.disconnect();
    };
  }, []);

  /** Khách bấm ✕ hoặc đã mở chat: thôi chào / nhắc trong lần vào web này. */
  function stopTeasing() {
    session(TEASER_KEY, "closed");
    setTeaser(null);
  }

  function browseFirst() {
    setTeaser("browse");
    setTimeout(() => setTeaser((t) => (t === "browse" ? null : t)), 4000);
  }

  function openChat() {
    stopTeasing();
    setMenu(false);
    setOpen(true);
    setSeen(true);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
  }

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

  function openAndAsk(text: string) {
    openChat();
    void send(text);
  }

  function reset() {
    setChatId(newId());
    setTurns([GREETING]);
    setError(null);
  }

  return (
    <>
      {!open && (
        // Một nút liên hệ duy nhất ở góc phải (thay cho cụm nút Messenger / Zalo
        // rời): bấm vào bung ra "Chat với trợ lý" trên cùng, rồi Messenger, Zalo.
        <>
          {menu && (
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => setMenu(false)}
              className="fixed inset-0 z-40 bg-navy-950/30"
            />
          )}
          {teaser && !menu && (
            <TeaserBubble
              kind={teaser}
              onClose={stopTeasing}
              onChat={openChat}
              onBrowse={browseFirst}
              onAsk={openAndAsk}
            />
          )}
          <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2.5">
            {menu && (
              <>
                <button
                  type="button"
                  onClick={openChat}
                  className="flex items-center gap-2.5 rounded-2xl bg-white py-2.5 pl-2.5 pr-4 text-left shadow-xl"
                >
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white bg-navy-950 shadow">
                    <Logo className="h-6" />
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-mint-500" />
                  </span>
                  <span>
                    <span className="block text-[15px] font-bold text-ink-900">Chat với trợ lý</span>
                    <span className="block text-xs font-semibold text-mint-600">Trả lời ngay · tư vấn &amp; đặt lịch</span>
                  </span>
                </button>
                {messenger && (
                  <TrackedLink
                    href={messenger}
                    event="nhan_messenger"
                    className="flex items-center gap-2.5 rounded-2xl bg-white py-2.5 pl-2.5 pr-4 text-sm font-semibold text-ink-900 shadow-xl"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#00B2FF] to-[#A033FF] text-white">
                      <IconChat className="h-5 w-5" />
                    </span>
                    Nhắn Messenger
                  </TrackedLink>
                )}
                {zalo && (
                  <TrackedLink
                    href={`https://zalo.me/${zalo}`}
                    event="nhan_zalo"
                    className="flex items-center gap-2.5 rounded-2xl bg-white py-2.5 pl-2.5 pr-4 text-sm font-semibold text-ink-900 shadow-xl"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0068ff] text-[10px] font-extrabold text-white">
                      Zalo
                    </span>
                    Nhắn Zalo
                  </TrackedLink>
                )}
              </>
            )}
            <div className="flex items-center gap-2.5">
              {!menu && !teaser && (
                <button
                  type="button"
                  onClick={() => setMenu(true)}
                  className="rounded-2xl bg-white px-3 py-2 text-left shadow-lg ring-1 ring-navy-100"
                >
                  <span className="block text-sm font-bold text-ink-900">Chat với trợ lý</span>
                  <span className="block text-[11px] font-semibold text-mint-600">● Đang trực · trả lời ngay</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setMenu((m) => !m)}
                aria-label={menu ? "Đóng" : "Liên hệ trung tâm"}
                aria-expanded={menu}
                className={`relative flex h-16 w-16 items-center justify-center rounded-full bg-coral-600 text-white shadow-xl shadow-coral-600/40 hover:bg-coral-700 ${
                  nudge && !menu ? "animate-bounce" : ""
                }`}
              >
                {menu ? (
                  <span className="text-3xl leading-none">✕</span>
                ) : (
                  <IconChat className="h-8 w-8" />
                )}
                {!menu && !seen && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-red-600 text-xs font-extrabold">
                    1
                  </span>
                )}
              </button>
            </div>
          </div>
        </>
      )}
      {open && (
        <div
          role="dialog"
          aria-label="Trợ lý tư vấn"
          className="fixed z-50 inset-x-0 bottom-0 h-[85dvh] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[600px] sm:max-h-[calc(100dvh-2rem)] sm:w-[380px] flex flex-col rounded-t-2xl sm:rounded-2xl border border-navy-100 bg-white shadow-2xl"
        >
          <div className="flex items-center gap-3 rounded-t-2xl bg-navy-950 px-4 py-3 text-white">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-navy-900">
              <Logo className="h-7" />
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-navy-950 bg-mint-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">Trợ lý tư vấn</p>
              <p className="text-xs text-mint-300">● Đang trực · trả lời ngay</p>
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
          <p className="px-4 pb-2 text-[11px] text-ink-400">Giáo vụ sẽ gọi xác nhận lại lịch học.</p>
        </div>
      )}
    </>
  );
}

const TEASER_TEXT: Record<Teaser, string> = {
  hello: GREETING.text,
  back: "Chào anh/chị, mừng anh/chị quay lại 👋 Mình chat tiếp nhé? Cần em báo học phí hay đặt lịch học thử cứ nói em ạ.",
  browse: "Dạ vâng ạ, anh/chị cứ thoải mái xem nhé 😊 Cần gì bấm nút chat bên dưới là em tư vấn ngay!",
  pricing: "Anh/chị đang xem học phí ạ? Em tư vấn gói phù hợp với độ tuổi, trình độ và mục tiêu học cho mình nhé.",
};

/** Khung lời chào nổi ngay trên nút chat. */
function TeaserBubble({
  kind,
  onClose,
  onChat,
  onBrowse,
  onAsk,
}: {
  kind: Teaser;
  onClose: () => void;
  onChat: () => void;
  onBrowse: () => void;
  onAsk: (text: string) => void;
}) {
  return (
    <div
      role="status"
      className="fixed bottom-24 right-4 z-40 w-[min(360px,calc(100vw-2rem))] rounded-[20px] rounded-br-md border border-navy-100 bg-white p-3.5 shadow-2xl"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Tắt lời chào"
        className="absolute right-2.5 top-2 rounded-lg px-1.5 text-lg leading-none text-ink-400 hover:bg-ivory-100"
      >
        ✕
      </button>
      <div className="mb-2 flex items-center gap-2.5">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-navy-950 shadow">
          <Logo className="h-6" />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-mint-500" />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-bold text-ink-900">Trợ lý tư vấn</span>
          <span className="block text-[11px] font-semibold text-mint-600">● Đang trực</span>
        </span>
      </div>
      <p className="pr-2 text-sm leading-relaxed text-ink-800">{TEASER_TEXT[kind]}</p>
      {(kind === "hello" || kind === "back") && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onChat}
            className="flex-1 rounded-xl bg-coral-600 px-2 py-2.5 text-sm font-bold text-white hover:bg-coral-700"
          >
            {kind === "back" ? "Chat tiếp" : "Tư vấn cho tôi"}
          </button>
          <button
            type="button"
            onClick={onBrowse}
            className="flex-1 rounded-xl border border-navy-200 px-2 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ivory-50"
          >
            Để tôi xem web trước
          </button>
        </div>
      )}
      {kind === "pricing" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {["Có ạ, tư vấn giúp tôi", "Nên chọn gói nào?"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onAsk(t)}
              className="rounded-full border border-wood-300 bg-white px-3 py-1.5 text-xs font-semibold text-wood-700 hover:bg-wood-50"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
