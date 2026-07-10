"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { FilterCheckboxDropdown } from "@/components/filter-checkbox-dropdown";
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

          // Never carry pagination across a filter change — the result set
          // changes, so a stale page could point past the last page.
          for (const key of preserveParamKeys) {
            if (key === "page") continue;
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
          emptyLabel="No teams"
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
