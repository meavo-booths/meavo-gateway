import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  [NotificationChannel.EMAIL]: "Email",
  [NotificationChannel.IN_APP]: "Bell",
  [NotificationChannel.SLACK]: "Slack",
};

function statusClass(status: NotificationStatus): string {
  switch (status) {
    case NotificationStatus.SENT:
      return "text-emerald-700";
    case NotificationStatus.FAILED:
      return "text-red-600";
    case NotificationStatus.PENDING:
    case NotificationStatus.PROCESSING:
      return "text-amber-700";
    default:
      return "text-slate-600";
  }
}

export async function AdminNotificationsLog() {
  const deliveries = await prisma.notificationDelivery.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      outbox: {
        select: {
          sourceApp: true,
          eventType: true,
          status: true,
          lastError: true,
        },
      },
    },
  });

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Recent notifications</h2>
      <p className="mt-1 text-sm text-slate-500">
        Last 50 deliveries (email, bell, Slack) processed by the gateway notification worker.
      </p>
      {deliveries.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No notifications sent yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">When</th>
                <th className="py-2 pr-4 font-medium">Event</th>
                <th className="py-2 pr-4 font-medium">Channel</th>
                <th className="py-2 pr-4 font-medium">Recipient</th>
                <th className="py-2 pr-4 font-medium">Subject</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-4 whitespace-nowrap text-slate-600">
                    {delivery.createdAt.toLocaleString("en-GB")}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-900">{delivery.outbox.eventType}</div>
                    <div className="text-xs text-slate-500">{delivery.outbox.sourceApp}</div>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">
                    {CHANNEL_LABELS[delivery.channel] ?? delivery.channel}
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{delivery.recipientEmail}</td>
                  <td className="py-3 pr-4 text-slate-700">{delivery.subject}</td>
                  <td className="py-3 pr-4">
                    <span className={statusClass(delivery.status)}>{delivery.status}</span>
                    {(delivery.error || delivery.outbox.lastError) && (
                      <div className="mt-1 text-xs text-red-600">
                        {delivery.error ?? delivery.outbox.lastError}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
