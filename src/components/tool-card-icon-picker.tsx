"use client";

import { useMemo, useState } from "react";
import {
  ICON_VARIANTS,
  TOOL_CARD_ICONS,
  type IconSection,
  type IconVariant,
} from "@/lib/tool-card-icons";

const SECTION_LABELS: Record<IconSection, string> = {
  apps: "Apps & tools",
  general: "General",
};

function resolveInitialVariant(defaultValue?: string | null): IconVariant {
  if (!defaultValue) return "green";
  return TOOL_CARD_ICONS.find((icon) => icon.key === defaultValue)?.variant ?? "green";
}

export function ToolCardIconPicker({
  name = "iconKey",
  defaultValue,
}: {
  name?: string;
  defaultValue?: string | null;
}) {
  const [selected, setSelected] = useState(defaultValue ?? "");
  const [variant, setVariant] = useState<IconVariant>(() => resolveInitialVariant(defaultValue));

  const iconsBySection = useMemo(() => {
    const filtered = TOOL_CARD_ICONS.filter((icon) => icon.variant === variant);
    return (["apps", "general"] as const).map((section) => ({
      section,
      label: SECTION_LABELS[section],
      icons: filtered.filter((icon) => icon.section === section),
    }));
  }, [variant]);

  return (
    <div className="sm:col-span-2">
      <span className="text-sm font-medium text-slate-700">Icon</span>
      <p className="mt-0.5 text-xs text-slate-500">Optional. Shown in the top-left of the tool card.</p>
      <input type="hidden" name={name} value={selected} />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {ICON_VARIANTS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setVariant(option.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              variant === option.key
                ? "bg-brand-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2">
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
        </div>

        {iconsBySection.map(({ section, label, icons }) =>
          icons.length === 0 ? null : (
            <div key={section}>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <div className="flex flex-wrap gap-2">
                {icons.map((icon) => (
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
                    <img
                      src={icon.file}
                      alt={icon.label}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  </button>
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
