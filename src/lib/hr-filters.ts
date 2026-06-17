import { Company, ContractType, Prisma } from "@prisma/client";
import { startOfUtcDay } from "@/lib/hr-employee";

export type HrUserTypeFilter = "user" | "employee";
export type HrStatusFilter = "active" | "past";
export type HrCompanyFilter = Company;
export type HrContractFilter = ContractType;

export const DEFAULT_HR_FILTERS = {
  userTypes: [] as HrUserTypeFilter[],
  statuses: ["active"] as HrStatusFilter[],
  companies: [] as HrCompanyFilter[],
  contracts: [] as HrContractFilter[],
  teams: [] as string[],
};

const USER_TYPE_VALUES: HrUserTypeFilter[] = ["user", "employee"];
const STATUS_VALUES: HrStatusFilter[] = ["active", "past"];
const COMPANY_VALUES: HrCompanyFilter[] = [Company.MEAVO, Company.OA];
const CONTRACT_VALUES: HrContractFilter[] = [ContractType.FTE, ContractType.FREELANCE];

const FILTER_PARAM_KEYS = ["userType", "status", "company", "contract", "team"] as const;

function parseMultiParam<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[]
): T[] {
  const allowedSet = new Set(allowed);
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  const selected = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is T => allowedSet.has(part as T));

  return [...new Set(selected)];
}

function hasFilterParams(searchParams: Record<string, string | string[] | undefined>): boolean {
  return FILTER_PARAM_KEYS.some((key) => searchParams[key] !== undefined);
}

function todayUtc(): Date {
  return startOfUtcDay(new Date());
}

function activeEmployeeWhere(
  extra: Prisma.EmployeeWhereInput = {}
): Prisma.EmployeeWhereInput {
  const today = todayUtc();
  return {
    AND: [extra, { OR: [{ endDate: null }, { endDate: { gte: today } }] }],
  };
}

function pastEmployeeWhere(
  extra: Prisma.EmployeeWhereInput = {}
): Prisma.EmployeeWhereInput {
  const today = todayUtc();
  return {
    AND: [extra, { endDate: { lt: today } }],
  };
}

function employeeFieldFilters(
  companies: HrCompanyFilter[],
  contracts: HrContractFilter[]
): Prisma.EmployeeWhereInput {
  const filters: Prisma.EmployeeWhereInput = {};
  if (companies.length > 0) filters.company = { in: companies };
  if (contracts.length > 0) filters.contract = { in: contracts };
  return filters;
}

function mergeEmployeeWhere(
  ...parts: (Prisma.EmployeeWhereInput | null | undefined)[]
): Prisma.EmployeeWhereInput {
  const andParts = parts.filter(
    (part): part is Prisma.EmployeeWhereInput => Boolean(part && Object.keys(part).length > 0)
  );
  if (andParts.length === 0) return {};
  if (andParts.length === 1) return andParts[0];
  return { AND: andParts };
}

function employeeStatusWhere(statuses: HrStatusFilter[]): Prisma.EmployeeWhereInput | null {
  const active = statuses.includes("active");
  const past = statuses.includes("past");
  if (active && past) return null;
  if (active) return activeEmployeeWhere();
  if (past) return pastEmployeeWhere();
  return null;
}

export function buildHrUserWhere({
  userTypes,
  statuses,
  companies,
  contracts,
  teams,
}: {
  userTypes: HrUserTypeFilter[];
  statuses: HrStatusFilter[];
  companies: HrCompanyFilter[];
  contracts: HrContractFilter[];
  teams: string[];
}): Prisma.UserWhereInput {
  const fieldFilters = employeeFieldFilters(companies, contracts);
  const hasFieldFilters = Object.keys(fieldFilters).length > 0;
  const statusFilter = employeeStatusWhere(statuses);
  const employeeWhere = mergeEmployeeWhere(
    hasFieldFilters ? fieldFilters : null,
    statusFilter
  );
  const hasEmployeeWhere = Object.keys(employeeWhere).length > 0;

  const showUsers = userTypes.length === 0 || userTypes.includes("user");
  const showEmployees = userTypes.length === 0 || userTypes.includes("employee");

  let base: Prisma.UserWhereInput;

  if (showUsers && showEmployees) {
    if (!hasEmployeeWhere) {
      base = {};
    } else {
      base = {
        OR: [{ employee: { is: null } }, { employee: { is: employeeWhere } }],
      };
    }
  } else if (showUsers) {
    base = { employee: { is: null } };
  } else if (!hasEmployeeWhere) {
    base = { employee: { isNot: null } };
  } else {
    base = { employee: { is: employeeWhere } };
  }

  if (teams.length === 0) return base;

  const teamFilter: Prisma.UserWhereInput = {
    teamMembers: { some: { teamId: { in: teams } } },
  };

  if (Object.keys(base).length === 0) return teamFilter;
  return { AND: [base, teamFilter] };
}

export function parseHrFilters(
  searchParams: {
    userType?: string | string[];
    status?: string | string[];
    company?: string | string[];
    contract?: string | string[];
    team?: string | string[];
  },
  validTeamIds: readonly string[] = []
) {
  if (!hasFilterParams(searchParams)) {
    return { ...DEFAULT_HR_FILTERS };
  }

  return {
    userTypes: parseMultiParam(searchParams.userType, USER_TYPE_VALUES),
    statuses: parseMultiParam(searchParams.status, STATUS_VALUES),
    companies: parseMultiParam(searchParams.company, COMPANY_VALUES),
    contracts: parseMultiParam(searchParams.contract, CONTRACT_VALUES),
    teams: parseMultiParam(searchParams.team, validTeamIds),
  };
}
