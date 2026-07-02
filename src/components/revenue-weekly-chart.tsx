"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui";
import type { WeeklyRevenuePoint } from "@/lib/revenue-dashboard";
import { formatEur } from "@/lib/revenue-stats";

function formatCompactEur(value: number): string {
  if (value >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(1)}m`;
  }
  if (value >= 1_000) {
    return `€${Math.round(value / 1_000)}k`;
  }
  return formatEur(value);
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: WeeklyRevenuePoint }[];
}) {
  if (!active || !payload?.[0]) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-slate-900">{point.label}</p>
      <p className="text-slate-600">{formatEur(point.revenue)}</p>
    </div>
  );
}

export function RevenueWeeklyChart({ data }: { data: WeeklyRevenuePoint[] }) {
  const totalRevenue = data.reduce((sum, point) => sum + point.revenue, 0);

  if (totalRevenue === 0) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Weekly revenue</h2>
        <p className="mt-2 text-sm text-slate-600">
          No revenue data for the last 12 complete weeks. Try clearing filters or refresh the Ops
          File import under Admin → Sheet imports.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Weekly revenue</h2>
        <p className="mt-1 text-sm text-slate-600">
          Last 12 complete Mon–Sun weeks (London), excluding the current week.
        </p>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={56}
            />
            <YAxis
              tickFormatter={formatCompactEur}
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.15)" }} />
            <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
