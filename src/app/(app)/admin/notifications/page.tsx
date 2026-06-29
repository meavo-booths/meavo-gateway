import { AdminNotificationEvents } from "@/components/admin-notification-events";
import { AdminNotificationsLog } from "@/components/admin-notifications-log";
import { getAdminNotificationEvents } from "@/lib/notifications/event-settings";

export default async function AdminNotificationsPage() {
  const events = await getAdminNotificationEvents();

  return (
    <div className="space-y-8">
      <AdminNotificationEvents events={events} />
      <AdminNotificationsLog />
    </div>
  );
}
