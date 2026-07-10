import { Prisma } from "@prisma/client";
import {
  LONDON_TIMEZONE,
  londonCalendarDayUtc,
  londonMonthStartUtc,
} from "@/lib/london-dates";
import { prisma } from "@/lib/prisma";
import { getLondonWeekday } from "@/lib/revenue-stats";

export type RevenueFilters = {
  markets: string[];
  clientTypes: string[];
  newVsRepeats: string[];
};

export type WeekRange = {
  start: Date;
  end: Date;
  label: string;
  shortLabel: string;
};

export type WeeklyRevenuePoint = {
  weekStart: string;
  label: string;
  shortLabel: string;
  revenue: number;
};

export type DailyRevenuePoint = {
  date: string;
  label: string;
  shortLabel: string;
  revenue: number;
};

export type MonthlyRevenuePoint = {
  monthStart: string;
  label: string;
  shortLabel: string;
  revenue: number;
};

export type RevenueFilterOptions = {
  markets: { value: string; label: string }[];
  clientTypes: { value: string; label: string }[];
  newVsRepeats: { value: string; label: string }[];
};

const FILTER_PARAM_KEYS = ["market", "clientType", "newVsRepeat"] as const;

function formatWeekLabel(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function formatShortWeekLabel(start: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    day: "numeric",
    month: "short",
  }).format(start);
}

export function getLast12CompleteWeekRanges(now = new Date()): WeekRange[] {
  const weekday = getLondonWeekday(now);
  const daysSinceMonday = (weekday + 6) % 7;
  const thisMondayOffset = -daysSinceMonday;

  const weeks: WeekRange[] = [];

  for (let weekIndex = 12; weekIndex >= 1; weekIndex -= 1) {
    const start = londonCalendarDayUtc(thisMondayOffset - weekIndex * 7, now);
    const end = londonCalendarDayUtc(thisMondayOffset - (weekIndex - 1) * 7 - 1, now);
    const label = formatWeekLabel(start, end);

    weeks.push({
      start,
      end,
      label,
      shortLabel: formatShortWeekLabel(start),
    });
  }

  return weeks;
}

function parseMultiParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return [
    ...new Set(
      raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    ),
  ];
}

export function parseRevenueFilters(
  searchParams: Record<string, string | string[] | undefined>
): RevenueFilters {
  return {
    markets: parseMultiParam(searchParams.market),
    clientTypes: parseMultiParam(searchParams.clientType),
    newVsRepeats: parseMultiParam(searchParams.newVsRepeat),
  };
}

export function hasRevenueFilterParams(
  searchParams: Record<string, string | string[] | undefined>
): boolean {
  return FILTER_PARAM_KEYS.some((key) => searchParams[key] !== undefined);
}

export function buildRevenueWhere(
  filters: RevenueFilters,
  dateRange: { start: Date; end: Date }
): Prisma.GatewaySheetRecordWhereInput {
  const where: Prisma.GatewaySheetRecordWhereInput = {
    invoiceDate: {
      gte: dateRange.start,
      lte: dateRange.end,
    },
    revenueEur: { not: null },
  };

  if (filters.markets.length > 0) {
    where.market = { in: filters.markets };
  }
  if (filters.clientTypes.length > 0) {
    where.clientType = { in: filters.clientTypes };
  }
  if (filters.newVsRepeats.length > 0) {
    where.newVsRepeat = { in: filters.newVsRepeats };
  }

  return where;
}

function toFilterOptions(values: string[]): { value: string; label: string }[] {
  return values
    .filter((value) => value.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, "en-GB"))
    .map((value) => ({ value, label: value }));
}

export async function getRevenueFilterOptions(): Promise<RevenueFilterOptions> {
  const [markets, clientTypes, newVsRepeats] = await Promise.all([
    prisma.gatewaySheetRecord.groupBy({
      by: ["market"],
      where: { market: { not: null } },
      _count: true,
    }),
    prisma.gatewaySheetRecord.groupBy({
      by: ["clientType"],
      where: { clientType: { not: null } },
      _count: true,
    }),
    prisma.gatewaySheetRecord.groupBy({
      by: ["newVsRepeat"],
      where: { newVsRepeat: { not: null } },
      _count: true,
    }),
  ]);

  return {
    markets: toFilterOptions(
      markets.map((row) => row.market).filter((value): value is string => Boolean(value))
    ),
    clientTypes: toFilterOptions(
      clientTypes
        .map((row) => row.clientType)
        .filter((value): value is string => Boolean(value))
    ),
    newVsRepeats: toFilterOptions(
      newVsRepeats
        .map((row) => row.newVsRepeat)
        .filter((value): value is string => Boolean(value))
    ),
  };
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function decimalToNumber(value: { toNumber(): number } | null | undefined): number {
  if (!value) return 0;
  return value.toNumber();
}

export async function getWeeklyRevenueChartData(
  filters: RevenueFilters,
  now = new Date()
): Promise<WeeklyRevenuePoint[]> {
  const weeks = getLast12CompleteWeekRanges(now);
  if (weeks.length === 0) return [];

  const dateRange = {
    start: weeks[0]!.start,
    end: weeks[weeks.length - 1]!.end,
  };

  const rows = await prisma.gatewaySheetRecord.findMany({
    where: buildRevenueWhere(filters, dateRange),
    select: {
      invoiceDate: true,
      revenueEur: true,
    },
  });

  const totalsByWeekStart = new Map<string, number>(
    weeks.map((week) => [dateKey(week.start), 0])
  );

  for (const row of rows) {
    if (!row.invoiceDate) continue;

    const invoiceTime = row.invoiceDate.getTime();
    const week = weeks.find(
      (range) => invoiceTime >= range.start.getTime() && invoiceTime <= range.end.getTime()
    );
    if (!week) continue;

    const key = dateKey(week.start);
    totalsByWeekStart.set(key, (totalsByWeekStart.get(key) ?? 0) + decimalToNumber(row.revenueEur));
  }

  return weeks.map((week) => ({
    weekStart: dateKey(week.start),
    label: week.label,
    shortLabel: week.shortLabel,
    revenue: totalsByWeekStart.get(dateKey(week.start)) ?? 0,
  }));
}

const DAILY_CHART_DAYS = 30;

function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatShortDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    day: "numeric",
    month: "short",
  }).format(date);
}

export async function getDailyRevenueChartData(
  filters: RevenueFilters,
  now = new Date()
): Promise<DailyRevenuePoint[]> {
  // Rolling window of the last 30 complete London days, ending yesterday.
  const days: Date[] = [];
  for (let offset = -DAILY_CHART_DAYS; offset <= -1; offset += 1) {
    days.push(londonCalendarDayUtc(offset, now));
  }

  const dateRange = { start: days[0]!, end: days[days.length - 1]! };

  const rows = await prisma.gatewaySheetRecord.findMany({
    where: buildRevenueWhere(filters, dateRange),
    select: {
      invoiceDate: true,
      revenueEur: true,
    },
  });

  const totalsByDay = new Map<string, number>(days.map((day) => [dateKey(day), 0]));

  for (const row of rows) {
    if (!row.invoiceDate) continue;
    const key = dateKey(row.invoiceDate);
    if (!totalsByDay.has(key)) continue;
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + decimalToNumber(row.revenueEur));
  }

  return days.map((day) => ({
    date: dateKey(day),
    label: formatDayLabel(day),
    shortLabel: formatShortDayLabel(day),
    revenue: totalsByDay.get(dateKey(day)) ?? 0,
  }));
}

const MONTHLY_CHART_FROM = { year: 2026, month: 0 };

function formatMonthLabel(date: Date, style: "long" | "short"): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  }).format(date);
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export async function getMonthlyRevenueChartData(
  filters: RevenueFilters,
  now = new Date()
): Promise<MonthlyRevenuePoint[]> {
  // Full months from January 2026 up to (excluding) the current London month.
  // Invoice dates are stored as UTC midnights of London calendar days, so
  // month buckets are plain UTC months.
  const currentMonthStart = londonMonthStartUtc(now);

  const months: Date[] = [];
  let cursor = new Date(Date.UTC(MONTHLY_CHART_FROM.year, MONTHLY_CHART_FROM.month, 1));
  while (cursor.getTime() < currentMonthStart.getTime()) {
    months.push(cursor);
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  if (months.length === 0) return [];

  const dateRange = {
    start: months[0]!,
    end: new Date(currentMonthStart.getTime() - 24 * 60 * 60 * 1000),
  };

  const rows = await prisma.gatewaySheetRecord.findMany({
    where: buildRevenueWhere(filters, dateRange),
    select: {
      invoiceDate: true,
      revenueEur: true,
    },
  });

  const totalsByMonth = new Map<string, number>(months.map((month) => [monthKey(month), 0]));

  for (const row of rows) {
    if (!row.invoiceDate) continue;
    const key = monthKey(row.invoiceDate);
    if (!totalsByMonth.has(key)) continue;
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + decimalToNumber(row.revenueEur));
  }

  return months.map((month) => ({
    monthStart: dateKey(month),
    label: formatMonthLabel(month, "long"),
    shortLabel: formatMonthLabel(month, "short"),
    revenue: totalsByMonth.get(monthKey(month)) ?? 0,
  }));
}
