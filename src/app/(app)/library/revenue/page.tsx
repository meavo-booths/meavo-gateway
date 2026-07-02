import { LibrarySection } from "@/components/library-section";
import { RevenueFilters } from "@/components/revenue-filters";
import { RevenueWeeklyChart } from "@/components/revenue-weekly-chart";
import {
  getRevenueFilterOptions,
  getWeeklyRevenueChartData,
  parseRevenueFilters,
} from "@/lib/revenue-dashboard";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseRevenueFilters(params);

  const [chartData, filterOptions] = await Promise.all([
    getWeeklyRevenueChartData(filters),
    getRevenueFilterOptions(),
  ]);

  return (
    <LibrarySection>
      <div className="space-y-6">
        <RevenueFilters
          markets={filters.markets}
          clientTypes={filters.clientTypes}
          newVsRepeats={filters.newVsRepeats}
          filterOptions={filterOptions}
        />
        <RevenueWeeklyChart data={chartData} />
      </div>
    </LibrarySection>
  );
}
