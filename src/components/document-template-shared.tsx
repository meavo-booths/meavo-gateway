"use client";

import { TEMPLATE_PLACEHOLDER_OPTIONS } from "@/lib/template-placeholders";

export type DocumentTemplateListItem = {
  id: string;
  name: string;
  description: string;
  versionCount: number;
  currentVersion: {
    id: string;
    versionNumber: number;
    body: string;
    createdAt: string;
  };
  versions: {
    id: string;
    versionNumber: number;
    createdAt: string;
    isCurrent: boolean;
  }[];
};

export type TemplateUserOption = { id: string; label: string };

export type TemplateVersionRef = { id: string; versionNumber: number };

export const templateFieldClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/** Dropdown that inserts a `{{placeholder}}` snippet into the body editor. */
export function InsertFieldSelect({
  onInsert,
}: {
  onInsert: (snippet: string) => void;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-slate-700">Insert field</span>
      <select
        className={templateFieldClassName}
        defaultValue=""
        onChange={(e) => {
          const path = e.target.value;
          if (!path) return;
          onInsert(`{{${path}}}`);
          e.target.value = "";
        }}
      >
        <option value="">Choose a field…</option>
        {TEMPLATE_PLACEHOLDER_OPTIONS.map((option) => (
          <option key={option.path} value={option.path}>
            {option.label} ({`{{${option.path}}}`})
          </option>
        ))}
      </select>
    </label>
  );
}
