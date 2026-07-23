import { RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

function getCalendarParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday") as (typeof WEEKDAYS)[number],
  };
}

function shiftCalendarDate(date: CalendarDate, deltaDays: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + deltaDays));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function calendarDateToUtc(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

export function getWeekRangeForTimeZone(
  timeZone: string,
  reference = new Date()
): { weekStart: Date; weekEnd: Date; weekLabel: string } {
  const today = getCalendarParts(reference, timeZone);
  const weekdayIndex = WEEKDAYS.indexOf(today.weekday);
  const monday = shiftCalendarDate(today, -weekdayIndex);
  const sunday = shiftCalendarDate(monday, 6);

  const weekStart = calendarDateToUtc(monday);
  const weekEnd = calendarDateToUtc(sunday);

  const weekLabel = formatDateRange(weekStart, weekEnd, timeZone);

  return { weekStart, weekEnd, weekLabel };
}

function formatDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateRange(start: Date, end: Date, timeZone: string): string {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(start);
  const endLabel = formatDate(end, timeZone);
  return startLabel === endLabel ? endLabel : `${startLabel} – ${endLabel}`;
}

function formatRequestRange(start: Date, end: Date, timeZone: string): string {
  return formatDateRange(start, end, timeZone);
}

function formatPublicHolidayDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function countryLabel(countryCode: string): string {
  return regionNames.of(countryCode) ?? countryCode;
}

function displayName(name: string | null | undefined, email: string): string {
  return name?.trim() || email;
}

function formatDays(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

export type WeeklyHolidayEntry = {
  name: string;
  team: string;
  startDate: Date;
  endDate: Date;
  days: number;
};

export type WeeklyPublicHoliday = {
  date: Date;
  countryCode: string;
  name: string;
};

export async function loadWeeklyHolidayEntries(
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyHolidayEntry[]> {
  const requests = await prisma.vacationRequest.findMany({
    where: {
      status: RequestStatus.APPROVED,
      startDate: { lte: weekEnd },
      endDate: { gte: weekStart },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          teamMembers: {
            orderBy: { createdAt: "asc" },
            take: 1,
            include: { team: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: [{ startDate: "asc" }, { user: { name: "asc" } }],
  });

  return requests.map((request) => ({
    name: displayName(request.user.name, request.user.email),
    team: request.user.teamMembers[0]?.team.name ?? "No team",
    startDate: request.startDate,
    endDate: request.endDate,
    days: request.days,
  }));
}

export async function loadWeeklyPublicHolidays(
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyPublicHoliday[]> {
  const usersWithCountry = await prisma.user.findMany({
    where: { holidayCountryCode: { not: null } },
    select: { holidayCountryCode: true },
    distinct: ["holidayCountryCode"],
  });

  const countryCodes = usersWithCountry
    .map((user) => user.holidayCountryCode)
    .filter((code): code is string => Boolean(code));

  if (countryCodes.length === 0) return [];

  const holidays = await prisma.publicHoliday.findMany({
    where: {
      countryCode: { in: countryCodes },
      date: { gte: weekStart, lte: weekEnd },
    },
    orderBy: [{ date: "asc" }, { countryCode: "asc" }],
  });

  return holidays.map((holiday) => ({
    date: holiday.date,
    countryCode: holiday.countryCode,
    name: holiday.localName || holiday.name || "Public holiday",
  }));
}

function formatPublicHolidayLine(
  holiday: WeeklyPublicHoliday,
  timeZone: string,
  { boldCountry = false }: { boldCountry?: boolean } = {}
): string {
  const when = formatPublicHolidayDate(holiday.date, timeZone);
  const country = countryLabel(holiday.countryCode);
  const countryPart = boldCountry ? `*${country}*` : country;
  return `• ${when} — ${countryPart}: ${holiday.name}`;
}

export function buildWeeklyHolidaySlackMessage({
  weekLabel,
  entries,
  publicHolidays,
  timeZone,
  holsUrl,
}: {
  weekLabel: string;
  entries: WeeklyHolidayEntry[];
  publicHolidays: WeeklyPublicHoliday[];
  timeZone: string;
  holsUrl?: string;
}): { text: string; blocks: unknown[] } {
  const header = `Who's on holiday this week (${weekLabel})`;

  const leaveLines =
    entries.length === 0
      ? ["Everyone is in this week — no approved leave scheduled."]
      : entries.map((entry) => {
          const dates = formatRequestRange(entry.startDate, entry.endDate, timeZone);
          const days = formatDays(entry.days);
          return `• ${entry.name} (${entry.team}) — ${dates} (${days})`;
        });

  const publicHolidayLines =
    publicHolidays.length === 0
      ? ["No public holidays this week."]
      : publicHolidays.map((holiday) => formatPublicHolidayLine(holiday, timeZone));

  const text = [
    `🏖️ ${header}`,
    "",
    ...leaveLines,
    "",
    "Public holidays this week",
    ...publicHolidayLines,
    holsUrl ? `\n${holsUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const blocks: unknown[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `🏖️ ${header}`, emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          entries.length === 0
            ? "_Everyone is in this week — no approved leave scheduled._"
            : entries
                .map((entry) => {
                  const dates = formatRequestRange(entry.startDate, entry.endDate, timeZone);
                  const days = formatDays(entry.days);
                  return `• *${entry.name}* (${entry.team}) — ${dates} (${days})`;
                })
                .join("\n"),
      },
    },
    {
      type: "header",
      text: { type: "plain_text", text: "Public holidays this week", emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          publicHolidays.length === 0
            ? "_No public holidays this week._"
            : publicHolidays
                .map((holiday) => formatPublicHolidayLine(holiday, timeZone, { boldCountry: true }))
                .join("\n"),
      },
    },
  ];

  if (holsUrl) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `<${holsUrl}|Open Vacation Tracker>` }],
    });
  }

  return { text, blocks };
}

export function getHolidayDigestTimeZone(): string {
  return process.env.HOLIDAY_DIGEST_TIMEZONE?.trim() || "Europe/Sofia";
}

export function isHolidayDigestEnabled(): boolean {
  const value = process.env.HOLIDAY_DIGEST_ENABLED?.trim().toLowerCase();
  return value !== "false" && value !== "0";
}
