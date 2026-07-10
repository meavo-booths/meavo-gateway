"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FilterCheckboxDropdown } from "@/components/filter-checkbox-dropdown";
import { Button, Card } from "@/components/ui";
import type { RevenueFilterOptions } from "@/lib/revenue-dashboard";

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
