import { listUnreadNotifications } from "@/lib/queries";
import { DismissNotificationButton } from "./dismiss-notification-button";

export async function NotificationsBanner({ userId }: { userId: number }) {
  const notifications = listUnreadNotifications(userId);
  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex items-start justify-between gap-3 bg-sky-50 border border-sky-200 text-sky-900 rounded-lg px-3 py-2 text-sm"
        >
          <span>🔔 {n.message}</span>
          <DismissNotificationButton id={n.id} />
        </div>
      ))}
    </div>
  );
}
