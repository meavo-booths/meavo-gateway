"use client";

import { useState } from "react";
import { ToolCardKind } from "@prisma/client";
import { LINKED_APP_OPTIONS } from "@/lib/tool-card-registry";
import { Select } from "@/components/ui";

export function ToolCardKindFields({
  defaultKind = ToolCardKind.LINK,
  defaultLinkedAppKey = "",
  usedLinkedAppKeys = [],
}: {
  defaultKind?: ToolCardKind;
  defaultLinkedAppKey?: string | null;
  usedLinkedAppKeys?: string[];
}) {
  const [kind, setKind] = useState<ToolCardKind>(defaultKind);

  const availableAppOptions = LINKED_APP_OPTIONS.filter(
    (option) =>
      option.value === defaultLinkedAppKey || !usedLinkedAppKeys.includes(option.value),
  );

  return (
    <div className="space-y-4 sm:col-span-2">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Card type</legend>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="kind"
            value={ToolCardKind.LINK}
            checked={kind === ToolCardKind.LINK}
            onChange={() => setKind(ToolCardKind.LINK)}
            className="mt-0.5 border-slate-300 text-brand-600 focus:ring-brand-100"
          />
          <span>
            <span className="font-medium">Link only</span>
            <span className="mt-0.5 block text-slate-500">
              Shows a tile on the dashboard. Does not control app login.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="kind"
            value={ToolCardKind.APP_ACCESS}
            checked={kind === ToolCardKind.APP_ACCESS}
            onChange={() => setKind(ToolCardKind.APP_ACCESS)}
            className="mt-0.5 border-slate-300 text-brand-600 focus:ring-brand-100"
          />
          <span>
            <span className="font-medium">App access</span>
            <span className="mt-0.5 block text-slate-500">
              Also controls who can sign in to a Meavo tool. Deleting this card revokes app
              login.
            </span>
          </span>
        </label>
      </fieldset>

      {kind === ToolCardKind.APP_ACCESS && (
        <div className="space-y-2">
          {availableAppOptions.length === 0 ? (
            <p className="text-sm text-amber-700">
              All registered apps already have an access card. Edit the existing card instead.
            </p>
          ) : (
            <Select
              label="Linked app"
              name="linkedAppKey"
              required
              defaultValue={defaultLinkedAppKey ?? availableAppOptions[0]?.value}
              options={availableAppOptions}
            />
          )}
        </div>
      )}
    </div>
  );
}
