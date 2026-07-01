import { Card } from "@/components/ui";
import { formatEur, type HomeRevenueStats } from "@/lib/revenue-stats";

function StatRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="text-sm text-slate-900">
        <span className="font-semibold">{value}</span>
        {detail && <span className="text-slate-600"> — {detail}</span>}
      </dd>
    </div>
  );
}

export function RevenueSummaryCard({ stats }: { stats: HomeRevenueStats }) {
  const biggestDealValue = stats.biggestDeal
    ? formatEur(stats.biggestDeal.revenue)
    : "—";
  const biggestDealDetail = stats.biggestDeal?.salesRep;

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Revenue</h2>
      <dl className="mt-4 space-y-3">
        <StatRow
          label={stats.referenceDayLabel}
          value={formatEur(stats.referenceDayRevenue)}
        />
        <StatRow
          label="Biggest deal"
          value={biggestDealValue}
          detail={biggestDealDetail}
        />
        <StatRow
          label={`Last week (${stats.lastWeekLabel})`}
          value={formatEur(stats.lastWeekRevenue)}
        />
      </dl>
    </Card>
  );
}
