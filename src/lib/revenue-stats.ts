import { LONDON_TIMEZONE, londonCalendarDayUtc } from "@/lib/london-dates";
import { prisma } from "@/lib/prisma";

export type HomeRevenueStats = {
  referenceDayLabel: "Yesterday" | "Friday";
  referenceDayRevenue: number;
  biggestDeal: { revenue: number; salesRep: string; dealId: string } | null;
  lastWeekRevenue: number;
  lastWeekLabel: string;
};

const eurFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatEur(amount: number): string {
  return eurFormatter.format(amount);
}

export function getLondonWeekday(now = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    weekday: "short",
  }).format(now);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? 0;
}

export function getRevenueReferenceDay(now = new Date()): {
  date: Date;
  label: "Yesterday" | "Friday";
} {
  const weekday = getLondonWeekday(now);

  if (weekday === 0) {
    return { date: londonCalendarDayUtc(-2, now), label: "Friday" };
  }
  if (weekday === 1) {
    return { date: londonCalendarDayUtc(-3, now), label: "Friday" };
  }
  if (weekday === 6) {
    return { date: londonCalendarDayUtc(-1, now), label: "Friday" };
  }

  return { date: londonCalendarDayUtc(-1, now), label: "Yesterday" };
}

export function getLastCalendarWeekRange(now = new Date()): { start: Date; end: Date } {
  const weekday = getLondonWeekday(now);
  const daysSinceMonday = (weekday + 6) % 7;
  const thisMondayOffset = -daysSinceMonday;

  return {
    start: londonCalendarDayUtc(thisMondayOffset - 7, now),
    end: londonCalendarDayUtc(thisMondayOffset - 1, now),
  };
}

function decimalToNumber(value: { toNumber(): number } | null | undefined): number {
  if (!value) return 0;
  return value.toNumber();
}

function formatWeekLabel(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(start)}–${formatter.format(end)}`;
}

export async function getHomeRevenueStats(now = new Date()): Promise<HomeRevenueStats> {
  const { date: referenceDay, label: referenceDayLabel } = getRevenueReferenceDay(now);
  const { start: lastWeekStart, end: lastWeekEnd } = getLastCalendarWeekRange(now);

  try {
    const [referenceDaySum, biggestDeal, lastWeekSum] = await Promise.all([
      prisma.gatewaySheetRecord.aggregate({
        where: { invoiceDate: referenceDay },
        _sum: { revenueEur: true },
      }),
      prisma.gatewaySheetRecord.findFirst({
        where: {
          invoiceDate: referenceDay,
          revenueEur: { not: null },
        },
        orderBy: { revenueEur: "desc" },
        select: {
          rowKey: true,
          revenueEur: true,
          salesRep: true,
        },
      }),
      prisma.gatewaySheetRecord.aggregate({
        where: {
          invoiceDate: {
            gte: lastWeekStart,
            lte: lastWeekEnd,
          },
        },
        _sum: { revenueEur: true },
      }),
    ]);

    const referenceDayRevenue = decimalToNumber(referenceDaySum._sum.revenueEur);
    const lastWeekRevenue = decimalToNumber(lastWeekSum._sum.revenueEur);

    return {
      referenceDayLabel,
      referenceDayRevenue,
      biggestDeal:
        biggestDeal?.revenueEur != null
          ? {
              revenue: biggestDeal.revenueEur.toNumber(),
              salesRep: biggestDeal.salesRep?.trim() || "Unknown",
              dealId: biggestDeal.rowKey,
            }
          : null,
      lastWeekRevenue,
      lastWeekLabel: formatWeekLabel(lastWeekStart, lastWeekEnd),
    };
  } catch (error) {
    console.error("Failed to load home revenue stats:", error);
    return {
      referenceDayLabel,
      referenceDayRevenue: 0,
      biggestDeal: null,
      lastWeekRevenue: 0,
      lastWeekLabel: formatWeekLabel(lastWeekStart, lastWeekEnd),
    };
  }
}
