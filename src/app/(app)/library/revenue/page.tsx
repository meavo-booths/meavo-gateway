import { LibrarySection } from "@/components/library-section";
import { RevenueDailyChart } from "@/components/revenue-daily-chart";
import { RevenueFilters } from "@/components/revenue-filters";
import { RevenueWeeklyChart } from "@/components/revenue-weekly-chart";
import {
  getDailyRevenueChartData,
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

  const [chartData, dailyChartData, filterOptions] = await Promise.all([
    getWeeklyRevenueChartData(filters),
    getDailyRevenueChartData(filters),
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
        <RevenueDailyChart data={dailyChartData} />
      </div>
    </LibrarySection>
  );
}
