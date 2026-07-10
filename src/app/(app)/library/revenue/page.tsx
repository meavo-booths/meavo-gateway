import { LibrarySection } from "@/components/library-section";
import { RevenueDailyChart } from "@/components/revenue-daily-chart";
import { RevenueFilters } from "@/components/revenue-filters";
import { RevenueMonthlyChart } from "@/components/revenue-monthly-chart";
import { RevenueWeeklyChart } from "@/components/revenue-weekly-chart";
import {
  getDailyRevenueChartData,
  getMonthlyRevenueChartData,
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

  const [chartData, dailyChartData, monthlyChartData, filterOptions] = await Promise.all([
    getWeeklyRevenueChartData(filters),
    getDailyRevenueChartData(filters),
    getMonthlyRevenueChartData(filters),
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
        <RevenueDailyChart data={dailyChartData} />
        <RevenueWeeklyChart data={chartData} />
        <RevenueMonthlyChart data={monthlyChartData} />
      </div>
    </LibrarySection>
  );
}
