import { Suspense } from "react";
import { buildHrUserWhere, parseHrFilters } from "@/lib/hr-filters";
import { prisma } from "@/lib/prisma";
import { HrFilters } from "@/components/hr-filters";
import { HrSalariesMonthPicker } from "@/components/hr-salaries-month-picker";
import { HrSalariesReport, type SalaryReportRow } from "@/components/hr-salaries-report";
import {
  compareMonthValue,
  currentCalendarMonth,
  formatMonthLabel,
  parseCompareMonth,
  salaryForMonth,
} from "@/lib/salary";

export default async function HrSalariesPage({
  searchParams,
}: {
  searchParams: Promise<{
    userType?: string | string[];
    status?: string | string[];
    company?: string | string[];
    contract?: string | string[];
    team?: string | string[];
    compareMonth?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const teamOptions = teams.map((team) => ({ value: team.id, label: team.name }));
  const validTeamIds = teams.map((team) => team.id);
  const parsed = parseHrFilters(params, validTeamIds);
  const filters = {
    ...parsed,
    userTypes:
      parsed.userTypes.length === 0
        ? (["employee"] as typeof parsed.userTypes)
        : parsed.userTypes,
  };
  const where = buildHrUserWhere(filters);

  const currentMonth = currentCalendarMonth();
  const compareMonth = parseCompareMonth(params.compareMonth);

  const users = await prisma.user.findMany({
    where: {
      ...where,
      employee: { isNot: null },
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      teamMembers: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { team: { select: { id: true, name: true } } },
      },
      employee: {
        select: {
          contract: true,
          startDate: true,
          endDate: true,
          salaryHistory: {
            orderBy: { effectiveFrom: "asc" },
            select: { yearlySalary: true, effectiveFrom: true },
          },
        },
      },
    },
  });

  const rows: SalaryReportRow[] = users
    .filter((user) => user.employee)
    .map((user) => {
      const employee = user.employee!;
      const team = user.teamMembers[0]?.team;
      const history = employee.salaryHistory;
      const employment = {
        startDate: employee.startDate,
        endDate: employee.endDate,
      };
      const currentYearly = salaryForMonth(
        employment,
        history,
        currentMonth.year,
        currentMonth.month
      );
      const compareYearly = salaryForMonth(
        employment,
        history,
        compareMonth.year,
        compareMonth.month
      );

      return {
        id: user.id,
        name: user.name ?? user.email,
        teamKey: team?.id ?? "none",
        teamName: team?.name ?? "No team",
        contract: employee.contract,
        currentYearly: currentYearly === null ? null : String(currentYearly),
        compareYearly: compareYearly === null ? null : String(compareYearly),
      };
    });

  const currentMonthLabel = formatMonthLabel(currentMonth.year, currentMonth.month);
  const compareMonthLabel = formatMonthLabel(compareMonth.year, compareMonth.month);
  const compareMonthValueStr = compareMonthValue(compareMonth.year, compareMonth.month);

  return (
    <div className="space-y-6">
      <HrFilters
        basePath="/hr/salaries"
        userTypes={filters.userTypes}
        statuses={filters.statuses}
        companies={filters.companies}
        contracts={filters.contracts}
        teams={filters.teams}
        teamOptions={teamOptions}
        preserveParamKeys={["compareMonth"]}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-slate-600">
          Current month: <span className="font-medium text-slate-900">{currentMonthLabel}</span>
        </p>
        <Suspense fallback={null}>
          <HrSalariesMonthPicker compareMonth={compareMonthValueStr} />
        </Suspense>
      </div>

      <HrSalariesReport
        rows={rows}
        currentMonthLabel={currentMonthLabel}
        compareMonthLabel={compareMonthLabel}
      />
    </div>
  );
}
