"use client";

import dynamic from "next/dynamic";

// Recharts is by far the heaviest client dependency; load the chart bundles
// lazily so the rest of the revenue page paints first.
function ChartSkeleton() {
  return (
    <div
      className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white"
      aria-busy="true"
      aria-label="Loading chart"
    />
  );
}

export const RevenueDailyChart = dynamic(
  () => import("@/components/revenue-daily-chart").then((mod) => mod.RevenueDailyChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export const RevenueWeeklyChart = dynamic(
  () => import("@/components/revenue-weekly-chart").then((mod) => mod.RevenueWeeklyChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export const RevenueMonthlyChart = dynamic(
  () => import("@/components/revenue-monthly-chart").then((mod) => mod.RevenueMonthlyChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
