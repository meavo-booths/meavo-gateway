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
              <th className="py-2 pr-4 font-medium">Event</th>
              <th className="py-2 pr-4 font-medium">App</th>
              <th className="py-2 pr-4 font-medium">Trigger</th>
              <th className="py-2 pr-4 font-medium">Description</th>
              <th className="py-2 pl-4 text-right font-medium">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {items.map((event) => {
              const pending = pendingType === event.eventType;
              return (
                <tr key={event.eventType} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-900">{event.label}</div>
                    <div className="text-xs text-slate-500">{event.eventType}</div>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{event.sourceApp}</td>
                  <td className="py-3 pr-4 text-slate-700">{event.trigger}</td>
                  <td className="py-3 pr-4 text-slate-600">{event.description}</td>
                  <td className="py-3 pl-4 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggle(event.eventType, !event.enabled)}
                      className={`inline-flex min-w-[4.5rem] items-center justify-center rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
                        event.enabled
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {pending ? "…" : event.enabled ? "On" : "Off"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
