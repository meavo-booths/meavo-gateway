"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import type { RevenueFilterOptions } from "@/lib/revenue-dashboard";

function FilterCheckboxDropdown({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
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
        <p className="mt-2 text-sm text-slate-500">No values</p>
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

export function RevenueFilters({
  markets,
  clientTypes,
  newVsRepeats,
  filterOptions,
}: {
  markets: string[];
  clientTypes: string[];
  newVsRepeats: string[];
  filterOptions: RevenueFilterOptions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const hasActiveFilters =
    markets.length > 0 || clientTypes.length > 0 || newVsRepeats.length > 0;

  return (
    <Card>
      <form
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const params = new URLSearchParams();

          for (const key of ["market", "clientType", "newVsRepeat"]) {
            const values = formData.getAll(key).map((value) => String(value));
            if (values.length > 0) params.set(key, values.join(","));
          }

          startTransition(() => {
            router.push(
              params.size ? `/library/revenue?${params.toString()}` : "/library/revenue"
            );
          });
        }}
      >
        <FilterCheckboxDropdown
          legend="Market"
          name="market"
          selected={markets}
          options={filterOptions.markets}
        />
        <FilterCheckboxDropdown
          legend="Client type"
          name="clientType"
          selected={clientTypes}
          options={filterOptions.clientTypes}
        />
        <FilterCheckboxDropdown
          legend="New vs repeat client"
          name="newVsRepeat"
          selected={newVsRepeats}
          options={filterOptions.newVsRepeats}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Filtering…" : "Apply filters"}
          </Button>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                startTransition(() => {
                  router.push("/library/revenue");
                });
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
