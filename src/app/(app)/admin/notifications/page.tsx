import { AdminNotificationEvents } from "@/components/admin-notification-events";
import {
  AdminNotificationsLog,
  getRecentNotificationDeliveries,
} from "@/components/admin-notifications-log";
import { getAdminNotificationEvents } from "@/lib/notifications/event-settings";

export default async function AdminNotificationsPage() {
  const [events, deliveries] = await Promise.all([
    getAdminNotificationEvents(),
    getRecentNotificationDeliveries(),
  ]);

  return (
    <div className="space-y-8">
      <AdminNotificationEvents events={events} />
      <AdminNotificationsLog deliveries={deliveries} />
    </div>
  );
}
