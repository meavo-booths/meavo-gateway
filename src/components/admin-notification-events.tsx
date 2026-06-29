"use client";

import { useState, useTransition } from "react";
import { setNotificationEventEnabled } from "@/app/actions/admin-notifications";
import type { AdminNotificationEvent } from "@/lib/notifications/event-settings";
import { Card } from "@/components/ui";

export function AdminNotificationEvents({
  events,
}: {
  events: AdminNotificationEvent[];
}) {
  const [items, setItems] = useState(events);
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(eventType: string, nextEnabled: boolean) {
    setPendingType(eventType);
    startTransition(async () => {
      try {
        await setNotificationEventEnabled(eventType, nextEnabled);
        setItems((current) =>
          current.map((item) =>
            item.eventType === eventType ? { ...item, enabled: nextEnabled } : item,
          ),
        );
      } finally {
        setPendingType(null);
      }
    });
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Notification events</h2>
      <p className="mt-1 text-sm text-slate-500">
        Turn email triggers on or off across gateway, hols, and assembly.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4 font-medium">Enabled</th>
              <th className="py-2 pr-4 font-medium">Event</th>
              <th className="py-2 pr-4 font-medium">App</th>
              <th className="py-2 pr-4 font-medium">Trigger</th>
              <th className="py-2 pr-4 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {items.map((event) => {
              const pending = pendingType === event.eventType;
              return (
                <tr key={event.eventType} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        checked={event.enabled}
                        disabled={pending}
                        onChange={(e) => toggle(event.eventType, e.target.checked)}
                      />
                      <span className="sr-only">
                        {event.enabled ? "Disable" : "Enable"} {event.label}
                      </span>
                    </label>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-900">{event.label}</div>
                    <div className="text-xs text-slate-500">{event.eventType}</div>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{event.sourceApp}</td>
                  <td className="py-3 pr-4 text-slate-700">{event.trigger}</td>
                  <td className="py-3 pr-4 text-slate-600">{event.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
