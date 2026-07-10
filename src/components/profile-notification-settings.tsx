"use client";

import { useState, useTransition } from "react";
import { NotificationChannel } from "@prisma/client";
import { setMyNotificationPreference } from "@/app/actions/notification-preferences";
import { Card } from "@/components/ui";

export type ProfileNotificationEvent = {
  eventType: string;
  label: string;
  description: string;
  sourceApp: string;
  // Channels the admin has enabled globally for this event.
  channels: { channel: NotificationChannel; label: string }[];
  // The user's current per-channel preference.
  prefs: Record<NotificationChannel, boolean>;
};

export function ProfileNotificationSettings({
  events,
}: {
  events: ProfileNotificationEvent[];
}) {
  const [items, setItems] = useState(events);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(eventType: string, channel: NotificationChannel, nextEnabled: boolean) {
    const key = `${eventType}:${channel}`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        await setMyNotificationPreference(eventType, channel, nextEnabled);
        setItems((current) =>
          current.map((item) =>
            item.eventType === eventType
              ? { ...item, prefs: { ...item.prefs, [channel]: nextEnabled } }
              : item,
          ),
        );
      } finally {
        setPendingKey(null);
      }
    });
  }

  if (items.length === 0) return null;

  return (
    <Card className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
      <p className="mt-1 text-sm text-slate-500">
        Choose how you want to be notified. Channels switched off by an admin are not shown.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4 font-medium">Notification</th>
              <th className="py-2 pr-4 font-medium">App</th>
              <th className="py-2 pl-4 text-right font-medium">Channels</th>
            </tr>
          </thead>
          <tbody>
            {items.map((event) => (
              <tr key={event.eventType} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4">
                  <div className="font-medium text-slate-900">{event.label}</div>
                  <div className="text-xs text-slate-500">{event.description}</div>
                </td>
                <td className="py-3 pr-4 text-slate-700">{event.sourceApp}</td>
                <td className="py-3 pl-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    {event.channels.map(({ channel, label }) => {
                      const enabled = event.prefs[channel];
                      const pending = pendingKey === `${event.eventType}:${channel}`;
                      return (
                        <button
                          key={channel}
                          type="button"
                          disabled={pending}
                          onClick={() => toggle(event.eventType, channel, !enabled)}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
                            enabled
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {pending ? "…" : `${label} ${enabled ? "on" : "off"}`}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
