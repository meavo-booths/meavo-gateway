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
import type { DailyRevenuePoint } from "@/lib/revenue-dashboard";
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
  payload?: { payload: DailyRevenuePoint }[];
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

export function RevenueDailyChart({ data }: { data: DailyRevenuePoint[] }) {
  const totalRevenue = data.reduce((sum, point) => sum + point.revenue, 0);

  if (totalRevenue === 0) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Daily revenue</h2>
        <p className="mt-2 text-sm text-slate-600">
          No revenue data for the last 30 days. Try clearing filters or refresh the Ops File
          import under Admin → Sheet imports.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Daily revenue</h2>
          <p className="mt-1 text-sm text-slate-600">
            Last 30 days (London), up to and including yesterday.
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-slate-900">{formatEur(totalRevenue)}</p>
          <p className="mt-1 text-sm text-slate-600">Total, past 30 days</p>
        </div>
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
              interval={4}
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
            <Bar dataKey="revenue" fill="#0ea5e9" radius={[3, 3, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
