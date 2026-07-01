"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";

export const HR_COMPANY_OPTIONS = [
  { value: "MEAVO", label: "MEAVO" },
  { value: "OA", label: "OA" },
];

export const HR_CONTRACT_OPTIONS = [
  { value: "FTE", label: "FTE" },
  { value: "FREELANCE", label: "Freelance" },
];

function FilterCheckboxGroup({
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
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">{legend}</legend>
      <div className="mt-2 space-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
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
    </fieldset>
  );
}

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
        <p className="mt-2 text-sm text-slate-500">No teams</p>
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

export function HrFilters({
  basePath,
  userTypes,
  statuses,
  companies,
  contracts,
  teams,
  teamOptions,
  preserveParamKeys = [],
}: {
  basePath: string;
  userTypes: string[];
  statuses: string[];
  companies: string[];
  contracts: string[];
  teams: string[];
  teamOptions: { value: string; label: string }[];
  preserveParamKeys?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <form
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:items-start"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const params = new URLSearchParams();

          for (const key of ["userType", "status", "company", "contract", "team"]) {
            const values = formData.getAll(key).map((value) => String(value));
            if (values.length > 0) params.set(key, values.join(","));
          }

          for (const key of preserveParamKeys) {
            const value = searchParams.get(key);
            if (value) params.set(key, value);
          }

          startTransition(() => {
            router.push(params.size ? `${basePath}?${params.toString()}` : basePath);
          });
        }}
      >
        <FilterCheckboxGroup
          legend="User type"
          name="userType"
          selected={userTypes}
          options={[
            { value: "user", label: "Users" },
            { value: "employee", label: "Employees" },
          ]}
        />
        <FilterCheckboxGroup
          legend="Status"
          name="status"
          selected={statuses}
          options={[
            { value: "active", label: "Active" },
            { value: "past", label: "Past" },
          ]}
        />
        <FilterCheckboxGroup
          legend="Company"
          name="company"
          selected={companies}
          options={HR_COMPANY_OPTIONS}
        />
        <FilterCheckboxGroup
          legend="Contract"
          name="contract"
          selected={contracts}
          options={HR_CONTRACT_OPTIONS}
        />
        <FilterCheckboxDropdown
          legend="Team"
          name="team"
          selected={teams}
          options={teamOptions}
        />
        <div className="flex items-end sm:col-span-2 lg:col-span-3 xl:col-span-1">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Filtering…" : "Apply filters"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
