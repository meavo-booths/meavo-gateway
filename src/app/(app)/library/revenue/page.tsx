import { LibrarySection } from "@/components/library-section";
import {
  RevenueDailyChart,
  RevenueMonthlyChart,
  RevenueWeeklyChart,
} from "@/components/revenue-charts-lazy";
import { RevenueFilters } from "@/components/revenue-filters";
import {
  getRevenueChartData,
  getRevenueFilterOptions,
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

  const [{ weekly: chartData, daily: dailyChartData, monthly: monthlyChartData }, filterOptions] =
    await Promise.all([getRevenueChartData(filters), getRevenueFilterOptions()]);

  return (
    <LibrarySection>
      <div className="space-y-6">
        <RevenueFilters
          markets={filters.markets}
          clientTypes={filters.clientTypes}
          newVsRepeats={filters.newVsRepeats}
          filterOptions={filterOptions}
        />
        <RevenueDailyChart data={dailyChartData} />
        <RevenueWeeklyChart data={chartData} />
        <RevenueMonthlyChart data={monthlyChartData} />
      </div>
    </LibrarySection>
  );
}
