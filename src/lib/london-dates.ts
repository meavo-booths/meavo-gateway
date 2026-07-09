/** Business timezone for Meavo calendar days (matches assembly app). */
export const LONDON_TIMEZONE = "Europe/London";

type DateParts = { year: number; month: number; day: number };

function getZonedDateParts(timeZone: string, date = new Date()): DateParts {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [year, month, day] = formatted.split("-").map(Number);
  return { year, month, day };
}

function partsToStoredDate(parts: DateParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function addDays(parts: DateParts, days: number): DateParts {
  const date = partsToStoredDate(parts);
  date.setUTCDate(date.getUTCDate() + days);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** UTC midnight for the first day of the current London calendar month. */
export function londonMonthStartUtc(now = new Date()): Date {
  const today = getZonedDateParts(LONDON_TIMEZONE, now);
  return partsToStoredDate({ year: today.year, month: today.month, day: 1 });
}

/** UTC midnight for a London calendar day, optionally offset by whole days. */
export function londonCalendarDayUtc(offsetDays = 0, now = new Date()): Date {
  const today = getZonedDateParts(LONDON_TIMEZONE, now);
  const parts = offsetDays === 0 ? today : addDays(today, offsetDays);
  return partsToStoredDate(parts);
}
