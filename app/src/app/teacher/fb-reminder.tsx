"use client";

import { useSyncExternalStore } from "react";
import { IconAlert, IconX } from "@/components/icons";

const KEY = "fb-reminder-dismissed";

// Store nhỏ đọc localStorage: server render ra null (luôn hiện banner), client
// đọc giá trị thật rồi thông báo lại khi người dùng bấm ẩn.
let listeners: (() => void)[] = [];

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function dismiss(today: string) {
  try {
    window.localStorage.setItem(KEY, today);
  } catch {
    /* bỏ qua khi trình duyệt chặn localStorage */
  }
  listeners.forEach((l) => l());
}

/**
 * Nhắc check-in nhóm Facebook — ẩn được trong ngày, tự hiện lại vào hôm sau.
 * Chỉ là tiện ích hiển thị phía client, không ảnh hưởng dữ liệu điểm danh.
 */
export default function FbReminder({ today }: { today: string }) {
  const dismissedOn = useSyncExternalStore(subscribe, getSnapshot, () => null);
  if (dismissedOn === today) return null;

  return (
    <div className="rounded-2xl border border-navy-100 bg-white px-4 py-3 flex items-center gap-3">
      <span className="shrink-0 rounded-lg bg-navy-50 text-navy-700 p-2">
        <IconAlert className="w-4.5 h-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900">Đừng quên check-in Facebook</p>
        <p className="text-xs text-ink-500">
          Điểm danh song song trên nhóm để tăng tương tác và thu hút học viên mới.
        </p>
      </div>
      <button
        type="button"
        onClick={() => dismiss(today)}
        aria-label="Ẩn nhắc nhở hôm nay"
        className="shrink-0 p-1.5 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-ivory-100 transition"
      >
        <IconX className="w-4 h-4" />
      </button>
    </div>
  );
}
