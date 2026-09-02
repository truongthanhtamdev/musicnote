import { listUnreadNotifications } from "@/lib/queries";
import { DismissNotificationButton } from "./dismiss-notification-button";
import { IconBell } from "./icons";

export async function NotificationsBanner({ userId }: { userId: number }) {
  const notifications = listUnreadNotifications(userId);
  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2 mb-5">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex items-start justify-between gap-3 bg-navy-50 border border-navy-100 text-navy-800 rounded-xl px-4 py-3 text-sm"
        >
          <span className="flex items-start gap-2.5 min-w-0">
            <IconBell className="w-4.5 h-4.5 shrink-0 mt-0.5 text-navy-600" />
            <span>{n.message}</span>
          </span>
          <DismissNotificationButton id={n.id} />
        </div>
      ))}
    </div>
  );
}
