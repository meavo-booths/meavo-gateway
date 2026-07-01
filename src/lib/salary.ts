import { startOfUtcDay } from "@/lib/hr-employee";

const MAX_YEARLY_SALARY = 10_000_000;

export type SalaryHistoryEntry = {
  yearlySalary: unknown;
  effectiveFrom: Date;
};

export type EmployeeEmployment = {
  startDate: Date;
  endDate: Date | null;
};

export function parseYearlySalary(
  value: FormDataEntryValue | null | undefined
): { ok: true; amount: number } | { ok: false; error: string } {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return { ok: false, error: "Yearly salary is required." };
  }

  const normalized = raw.replace(/,/g, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid positive salary amount." };
  }
  if (amount > MAX_YEARLY_SALARY) {
    return { ok: false, error: "Salary amount is too large." };
  }

  return { ok: true, amount: Math.round(amount * 100) / 100 };
}

export function parseTaxPercent(
  value: FormDataEntryValue | null | undefined
): { ok: true; amount: number } | { ok: false; error: string } {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return { ok: true, amount: 0 };
  }

  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100) {
    return { ok: false, error: "Tax percentage must be between 0 and 100." };
  }

  return { ok: true, amount: Math.round(amount * 100) / 100 };
}

export function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function monthlyFromYearly(yearly: number | string): number {
  const amount = decimalToNumber(yearly);
  if (amount === null) return 0;
  return Math.round((amount / 12) * 100) / 100;
}

export function formatSalaryEur(amount: number | string | null | undefined): string {
  const value = decimalToNumber(amount);
  if (value === null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function salaryEffectiveOnDate(
  history: SalaryHistoryEntry[],
  date: Date
): number | null {
  const target = startOfUtcDay(date).getTime();
  let latest: SalaryHistoryEntry | null = null;

  for (const entry of history) {
    const effective = startOfUtcDay(entry.effectiveFrom).getTime();
    if (effective <= target) {
      if (!latest || effective >= startOfUtcDay(latest.effectiveFrom).getTime()) {
        latest = entry;
      }
    }
  }

  return latest ? decimalToNumber(latest.yearlySalary) : null;
}

export function monthBounds(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start: startOfUtcDay(start), end: startOfUtcDay(end) };
}

export function isEmployedInMonth(
  employee: EmployeeEmployment,
  year: number,
  month: number
): boolean {
  const { start, end } = monthBounds(year, month);
  const employmentStart = startOfUtcDay(employee.startDate);
  if (employmentStart > end) return false;
  if (!employee.endDate) return true;
  const employmentEnd = startOfUtcDay(employee.endDate);
  return employmentEnd >= start;
}

export function salaryForMonth(
  employee: EmployeeEmployment,
  history: SalaryHistoryEntry[],
  year: number,
  month: number
): number | null {
  if (!isEmployedInMonth(employee, year, month)) return null;
  const { end } = monthBounds(year, month);
  return salaryEffectiveOnDate(history, end);
}

export function currentCalendarMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export function previousCalendarMonth(): { year: number; month: number } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function parseCompareMonth(
  value: string | string[] | undefined
): { year: number; month: number } {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) {
    return previousCalendarMonth();
  }
  const [yearPart, monthPart] = raw.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return previousCalendarMonth();
  }
  return { year, month };
}

export function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function compareMonthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
