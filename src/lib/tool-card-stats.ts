import { RequestStatus } from "@prisma/client";
import { londonCalendarDayUtc } from "@/lib/london-dates";
import { prisma } from "@/lib/prisma";
import { isLinkedAppKey, type LinkedAppKey } from "@/lib/tool-card-registry";

export type ToolCardStatLine = { label: string; value: string };

export type ToolCardStats = { lines: ToolCardStatLine[] };

async function getAssemblyStats(): Promise<ToolCardStats> {
  const yesterday = londonCalendarDayUtc(-1);
  const today = londonCalendarDayUtc(0);

  const [yesterdayCount, todayCount] = await Promise.all([
    prisma.assembly.count({ where: { assemblyDate: yesterday } }),
    prisma.assembly.count({ where: { assemblyDate: today } }),
  ]);

  return {
    lines: [
      { label: "Yesterday", value: String(yesterdayCount) },
      { label: "Today", value: String(todayCount) },
    ],
  };
}

async function getHolsStats(): Promise<ToolCardStats> {
  const today = londonCalendarDayUtc(0);

  const offToday = await prisma.vacationRequest.findMany({
    where: {
      status: RequestStatus.APPROVED,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  const count = offToday.length;

  return {
    lines: [
      {
        label: count === 1 ? "person off today" : "people off today",
        value: String(count),
      },
    ],
  };
}

const STATS_FETCHERS: Record<LinkedAppKey, () => Promise<ToolCardStats>> = {
  assembly: getAssemblyStats,
  hols: getHolsStats,
};

export async function getToolCardStats(
  linkedAppKey: string | null
): Promise<ToolCardStats | null> {
  if (!isLinkedAppKey(linkedAppKey)) return null;

  const fetcher = STATS_FETCHERS[linkedAppKey];
  try {
    return await fetcher();
  } catch (error) {
    console.error(`Failed to load tool card stats for ${linkedAppKey}:`, error);
    return null;
  }
}

export async function getToolCardStatsMap(
  linkedAppKeys: Iterable<string | null | undefined>
): Promise<Map<string, ToolCardStats>> {
  const keys = [...new Set([...linkedAppKeys].filter(isLinkedAppKey))];
  const entries = await Promise.all(
    keys.map(async (key) => [key, await getToolCardStats(key)] as const)
  );

  const map = new Map<string, ToolCardStats>();
  for (const [key, stats] of entries) {
    if (stats) map.set(key, stats);
  }
  return map;
}
