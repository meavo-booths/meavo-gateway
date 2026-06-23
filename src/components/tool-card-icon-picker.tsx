"use client";

import { useState } from "react";
import { TOOL_CARD_ICONS } from "@/lib/tool-card-icons";

export function ToolCardIconPicker({
  name = "iconKey",
  defaultValue,
}: {
  name?: string;
  defaultValue?: string | null;
}) {
  const [selected, setSelected] = useState(defaultValue ?? "");

  return (
    <div className="sm:col-span-2">
      <span className="text-sm font-medium text-slate-700">Icon</span>
      <p className="mt-0.5 text-xs text-slate-500">Optional. Shown in the top-left of the tool card.</p>
      <input type="hidden" name={name} value={selected} />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelected("")}
          className={`flex h-10 w-10 items-center justify-center rounded-full border text-xs text-slate-500 transition ${
            selected === ""
              ? "border-brand-500 ring-2 ring-brand-100"
              : "border-slate-200 hover:border-slate-300"
          }`}
          title="No icon"
        >
          —
        </button>
        {TOOL_CARD_ICONS.map((icon) => (
          <button
            key={icon.key}
            type="button"
            onClick={() => setSelected(icon.key)}
            className={`rounded-full transition ${
              selected === icon.key
                ? "ring-2 ring-brand-500 ring-offset-1"
                : "hover:opacity-80"
            }`}
            title={icon.label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icon.file} alt={icon.label} width={40} height={40} className="rounded-full" />
          </button>
        ))}
      </div>
    </div>
  );
}
