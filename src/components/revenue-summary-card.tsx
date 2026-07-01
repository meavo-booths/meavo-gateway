import { Card } from "@/components/ui";
import { formatEur, type HomeRevenueStats } from "@/lib/revenue-stats";

function StatSegment({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <span>
      {label}: <span className="font-semibold text-slate-900">{value}</span>
      {detail && <span className="text-slate-500"> ({detail})</span>}
    </span>
  );
}

export function RevenueSummaryCard({ stats }: { stats: HomeRevenueStats }) {
  const biggestDealValue = stats.biggestDeal
    ? formatEur(stats.biggestDeal.revenue)
    : "—";
  const biggestDealDetail = stats.biggestDeal?.salesRep;

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">Revenue</span>
        <StatSegment
          label={stats.referenceDayLabel}
          value={formatEur(stats.referenceDayRevenue)}
        />
        <StatSegment
          label="Biggest deal"
          value={biggestDealValue}
          detail={biggestDealDetail}
        />
        <StatSegment
          label={`Last week (${stats.lastWeekLabel})`}
          value={formatEur(stats.lastWeekRevenue)}
        />
      </div>
    </Card>
  );
}
