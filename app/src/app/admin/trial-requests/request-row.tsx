"use client";

import { useTransition } from "react";
import { deleteTrialRequestAction, setTrialRequestStatusAction } from "@/actions/trial";
import {
  LANGUAGE_LABELS,
  TRIAL_REQUEST_STATUS_LABELS,
  type TrialRequestRow,
  type TrialRequestStatus,
} from "@/lib/types";
import { StatusChip, inlineAction } from "@/components/ui";

const TONE: Record<TrialRequestStatus, "coral" | "amber" | "mint" | "neutral"> = {
  new: "coral",
  contacted: "amber",
  done: "mint",
  cancelled: "neutral",
};

export default function RequestRow({ request }: { request: TrialRequestRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className={request.status === "new" ? "bg-coral-50/40" : "hover:bg-ivory-50"}>
      <td className="px-4 py-3">
        <p className="font-medium text-ink-900">{request.name}</p>
        <p className="text-xs text-ink-400 tabular">{request.created_at.slice(0, 16)}</p>
      </td>
      <td className="px-4 py-3">
        <a
          href={`tel:${request.phone.replace(/[^0-9+]/g, "")}`}
          className="font-medium text-navy-600 hover:underline tabular whitespace-nowrap"
        >
          {request.phone}
        </a>
        {request.contact && <ContactLines value={request.contact} />}
      </td>
      <td className="px-4 py-3 text-ink-700 whitespace-nowrap">
        {request.subject}
        <span className="block text-xs text-ink-400">{LANGUAGE_LABELS[request.language]}</span>
      </td>
      <td className="px-4 py-3 text-ink-600 text-sm max-w-[280px]">{request.note || "–"}</td>
      <td className="px-4 py-3">
        <StatusChip tone={TONE[request.status]}>
          {TRIAL_REQUEST_STATUS_LABELS[request.status]}
        </StatusChip>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          <select
            value={request.status}
            disabled={isPending}
            onChange={(e) =>
              startTransition(() =>
                setTrialRequestStatusAction(request.id, e.target.value as TrialRequestStatus)
              )
            }
            aria-label={`Trạng thái của ${request.name}`}
            className="rounded-lg border border-navy-200 px-2 py-1.5 text-sm"
          >
            {Object.entries(TRIAL_REQUEST_STATUS_LABELS).map(([value, textLabel]) => (
              <option key={value} value={value}>
                {textLabel}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(`Xoá đăng ký của ${request.name}?`)) {
                startTransition(() => deleteTrialRequestAction(request.id));
              }
            }}
            className={`${inlineAction} text-xs text-coral-600 hover:underline disabled:opacity-60`}
          >
            Xoá
          </button>
        </div>
      </td>
    </tr>
  );
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;

/**
 * Khách gõ mọi thứ vào một ô "Facebook / Zalo / Email", nên tách theo dấu "/"
 * rồi xuống dòng từng cái. Trước đây cắt bằng "..." nên email dài bị mất
 * đuôi — mà email là thứ giáo vụ cần nhất để liên hệ khách nước ngoài.
 */
function ContactLines({ value }: { value: string }) {
  const parts = value
    // Chỉ tách ở dấu "/" có khoảng trắng hai bên — bổ ở mọi dấu "/" thì
    // "fb.com/trangnt" bị cắt làm đôi.
    .split(/\s+\/\s+|\s*[;|]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <ul className="mt-0.5 space-y-0.5 max-w-[240px]">
      {parts.map((part, i) => {
        const email = part.match(EMAIL)?.[0];
        return (
          <li key={i} className="text-xs text-ink-500 break-words">
            {email ? (
              <>
                {part.slice(0, part.indexOf(email))}
                <a href={`mailto:${email}`} className="text-navy-600 hover:underline break-all">
                  {email}
                </a>
              </>
            ) : (
              part
            )}
          </li>
        );
      })}
    </ul>
  );
}
