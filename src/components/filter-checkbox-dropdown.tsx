"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Multi-select checkbox dropdown for filter forms. Values submit as repeated
 * checkbox entries under `name`; the parent form reads them via `getAll`.
 */
export function FilterCheckboxDropdown({
  legend,
  name,
  options,
  selected,
  emptyLabel = "No values",
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLFieldSetElement>(null);

  const summary =
    selected.length === 0
      ? "All"
      : selected.length === 1
        ? (options.find((option) => option.value === selected[0])?.label ?? "1 selected")
        : `${selected.length} selected`;

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <fieldset ref={containerRef} className="relative">
      <legend className="text-sm font-medium text-slate-700">{legend}</legend>
      {options.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="mt-2 flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="truncate">{summary}</span>
            <span className="ml-2 shrink-0 text-slate-400" aria-hidden>
              {open ? "▴" : "▾"}
            </span>
          </button>
          <div
            className={
              open
                ? "absolute z-20 mt-1 max-h-60 w-full min-w-[12rem] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
                : "h-0 overflow-hidden"
            }
          >
            {options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  name={name}
                  value={option.value}
                  defaultChecked={selected.includes(option.value)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-100"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
}
