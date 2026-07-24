import { RequestStatus } from "@prisma/client";
import { londonCalendarDayUtc } from "@/lib/london-dates";
import { prisma } from "@/lib/prisma";
import { isLinkedAppKey, type LinkedAppKey } from "@/lib/tool-card-registry";

export type ToolCardStatLine = { label: string; value: string; detail?: string };

export type ToolCardStats = { lines: ToolCardStatLine[] };

function firstName(name: string | null, email: string): string {
  if (name?.trim()) {
    return name.trim().split(/\s+/)[0]!;
  }
  return email.split("@")[0]!;
}

function formatNameList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

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
    select: {
      userId: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const seen = new Set<string>();
  const names: string[] = [];
  for (const request of offToday) {
    if (seen.has(request.userId)) continue;
    seen.add(request.userId);
    names.push(firstName(request.user.name, request.user.email));
  }

  const count = names.length;

  return {
    lines: [
      {
        label: count === 1 ? "person off today" : "people off today",
        value: String(count),
        detail: count > 0 ? formatNameList(names) : undefined,
      },
    ],
  };
}

async function getMrpStats(): Promise<ToolCardStats> {
  // Raw query: the MrpDocument table is owned by the MRP app and absent from
  // gateway's Prisma schema (which is a subset of the shared DB).
  const rows = await prisma.$queryRaw<{ pending: bigint; approved: bigint }[]>`
    SELECT
      COUNT(*) FILTER (WHERE "status" = 'pending_review') AS pending,
      COUNT(*) FILTER (WHERE "status" IN ('approved', 'synced')
        AND "approvedAt" >= date_trunc('month', now())) AS approved
    FROM "MrpDocument"
  `;
  const pending = Number(rows[0]?.pending ?? 0);
  const approved = Number(rows[0]?.approved ?? 0);

  return {
    lines: [
      { label: "Pending review", value: String(pending) },
      { label: "Approved this month", value: String(approved) },
    ],
  };
}

async function getFactoryStats(): Promise<ToolCardStats> {
  // Raw query: Factory tables are owned by the factory app and absent from
  // gateway's Prisma schema (which is a subset of the shared DB).
  const rows = await prisma.$queryRaw<{ active: bigint; today: bigint }[]>`
    SELECT
      (SELECT COUNT(*) FROM "FactoryProductionBatch" WHERE "status" = 'active') AS active,
      (SELECT COALESCE(SUM("qtyGood"), 0) FROM "FactoryProductionEvent"
        WHERE "recordedAt" >= date_trunc('day', now())) AS today
  `;
  const active = Number(rows[0]?.active ?? 0);
  const today = Number(rows[0]?.today ?? 0);

  return {
    lines: [
      { label: "Active batches", value: String(active) },
      { label: "Parts today", value: String(today) },
    ],
  };
}

async function getSalesStats(): Promise<ToolCardStats> {
  // Raw query: the Deal table is owned by the sales app and intentionally
  // absent from gateway's Prisma schema (which is a subset of the shared DB).
  const rows = await prisma.$queryRaw<{ open: bigint; won: bigint }[]>`
    SELECT
      COUNT(*) FILTER (WHERE "stage" = 'QUOTE') AS open,
      COUNT(*) FILTER (WHERE "stage" = 'WON' AND "wonAt" >= date_trunc('month', now())) AS won
    FROM "Deal"
  `;
  const open = Number(rows[0]?.open ?? 0);
  const won = Number(rows[0]?.won ?? 0);

  return {
    lines: [
      { label: "Open quotes", value: String(open) },
      { label: "Won this month", value: String(won) },
    ],
  };
}

async function getRpStats(): Promise<ToolCardStats> {
  // RP app tables are not yet in the shared schema; omit home-page stats for now.
  return { lines: [] };
}

async function getClockStats(): Promise<ToolCardStats> {
  // Clock-In app tables are not yet in the shared schema; omit home-page stats for now.
  return { lines: [] };
}

async function getTasksStats(): Promise<ToolCardStats> {
  // Raw query: Task tables are owned by the tasks app and absent from
  // gateway's Prisma schema (which is a subset of the shared DB).
  const rows = await prisma.$queryRaw<{ open: bigint }[]>`
    SELECT COUNT(*) AS open FROM "Task" WHERE "status" = 'OPEN'
  `;
  const open = Number(rows[0]?.open ?? 0);

  return {
    lines: [
      {
        value: String(open),
        label: open === 1 ? "open task" : "open tasks",
      },
    ],
  };
}

const STATS_FETCHERS: Record<LinkedAppKey, () => Promise<ToolCardStats>> = {
  assembly: getAssemblyStats,
  hols: getHolsStats,
  sales: getSalesStats,
  mrp: getMrpStats,
  factory: getFactoryStats,
  rp: getRpStats,
  clock: getClockStats,
  tasks: getTasksStats,
  zeron: async () => ({ lines: [] }),
  requests: async () => ({ lines: [] }),
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
