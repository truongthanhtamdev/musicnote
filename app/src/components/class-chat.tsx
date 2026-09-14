"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { markClassMessagesReadAction, sendClassMessageAction } from "@/actions/messages";
import type { FormState } from "@/actions/teachers";
import type { ClassMessage } from "@/lib/queries";
import { MESSAGE_MAX_LENGTH } from "@/lib/types";
import { btn } from "./ui";

const initialState: FormState = {};
/** Nhịp hỏi tin mới. Vài chục người dùng cùng lúc nên 10 giây là thoải mái. */
const POLL_MS = 10_000;

function roleLabel(role: string): string {
  if (role === "teacher") return "Giáo viên";
  if (role === "student") return "Học viên";
  return "Trung tâm";
}

function timeLabel(iso: string): string {
  // SQLite trả "YYYY-MM-DD HH:MM:SS" theo giờ UTC.
  const d = new Date(iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Khung nhắn tin của một lớp, dùng chung cho cả trang giáo viên và học viên.
 *
 * Tự hỏi server mỗi 10 giây xem có tin mới không, thay vì mở kết nối thời gian
 * thực: trung tâm chỉ vài chục người dùng, thêm hạ tầng cho việc này không
 * đáng, mà máy chủ hiện tại cũng không kham.
 */
export default function ClassChat({
  classId,
  messages,
  meId,
}: {
  classId: number;
  messages: ClassMessage[];
  meId: number;
}) {
  const [state, formAction, pending] = useActionState(sendClassMessageAction, initialState);
  const [body, setBody] = useState("");
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);

  // Xoá ô nhập ngay khi gửi xong, chỉnh state lúc render thay vì dùng effect.
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.success) setBody("");
  }

  useEffect(() => {
    markClassMessagesReadAction(classId).catch(() => {});
  }, [classId, messages.length]);

  useEffect(() => {
    const t = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  return (
    <div>
      <div className="px-4 py-4 space-y-3 bg-ivory-50 max-h-[60vh] overflow-y-auto scroll-thin">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-400 text-center py-6">
            Chưa có tin nhắn nào. Bạn nhắn câu đầu tiên nhé.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%] sm:max-w-[70%]">
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                      mine
                        ? "bg-navy-700 text-white rounded-br-md"
                        : "bg-white border border-navy-100 text-ink-900 rounded-bl-md"
                    }`}
                  >
                    {m.body}
                  </div>
                  <p
                    className={`text-xs text-ink-400 mt-1 tabular ${mine ? "text-right" : ""}`}
                  >
                    {mine ? "Bạn" : `${m.sender_name} · ${roleLabel(m.sender_role)}`} ·{" "}
                    {timeLabel(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form action={formAction} className="p-4 border-t border-navy-100 space-y-2">
        <input type="hidden" name="class_id" value={classId} />
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MESSAGE_MAX_LENGTH}
          required
          rows={3}
          placeholder="Nhập tin nhắn..."
          aria-label="Nội dung tin nhắn"
          className="w-full rounded-xl border border-navy-200 px-3 py-2 text-sm resize-y"
        />
        {state.error && <p className="text-sm text-coral-600">{state.error}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-400">
            Giáo vụ trung tâm cũng đọc được khung chat này.
          </p>
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className={`${btn.primary} disabled:opacity-50`}
          >
            {pending ? "Đang gửi..." : "Gửi"}
          </button>
        </div>
      </form>
    </div>
  );
}
